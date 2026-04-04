import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Customer from "../models/Customer.js";
import Shop from "../models/Shop.js";
import ServicePlan from "../models/ServicePlan.js";
import ServiceSchedule from "../models/ServiceSchedule.js";
import InvoiceItem from "../models/InvoiceItem.js";
import Invoice from "../models/Invoice.js";
import FestivalSchedule from "../models/FestivalSchedule.js";
import {
  createDateRange,
  getISTDateParts,
  getISTTodayParts,
} from "../scheduler/core/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });
const SHOP_ID = new mongoose.Types.ObjectId("696f000487f0258e94f1ee1b");
const tomorrowRange = createDateRange(1);

const getTomorrowISTParts = () => getISTDateParts(tomorrowRange.start);

const printSection = (title) => {
  console.log(`\n==============================`);
  console.log(`   ${title}`);
  console.log(`==============================`);
};

const getSummary = async () => {
  printSection("TODAY RUN");

  // Get today's IST parts for wishes
  const todayISTParts = getISTTodayParts();
  console.log(
    `Today IST month/day: ${todayISTParts.month}/${todayISTParts.date}`,
  );

  const todayRange = createDateRange(0);
  const thirtyDaysRange = createDateRange(30);

  // 🎂 Today's Wishes (Birthday + Anniversary)
  const birthdayCustomersToday = await Customer.aggregate([
    {
      $match: {
        date_of_birth: { $ne: null },
        deleted_at: null,
        shop_id: SHOP_ID,
      },
    },
    {
      $addFields: {
        month: { $month: "$date_of_birth" },
        day: { $dayOfMonth: "$date_of_birth" },
      },
    },
    { $match: { month: todayISTParts.month, day: todayISTParts.date } },
  ]);

  const anniversaryCustomersToday = await Customer.aggregate([
    {
      $match: {
        anniversary_date: { $exists: true, $ne: null },
        deleted_at: null,
        shop_id: SHOP_ID,
      },
    },
    {
      $addFields: {
        month: { $month: "$anniversary_date" },
        day: { $dayOfMonth: "$anniversary_date" },
      },
    },
    { $match: { month: todayISTParts.month, day: todayISTParts.date } },
  ]);

  // 🎉 Today's Festival Wishes
  console.log(`\n🎉 Today's Festival Wishes:`);

  const now = new Date();

  const year = now.getUTCFullYear(); // ✅ FIX
  const month = todayISTParts.month;
  const date = todayISTParts.date;

  const todaysFestivals = await FestivalSchedule.find({
    schedule_date: {
      $gte: todayRange.start,
      $lt: todayRange.end,
    },
  });
  console.log(`  festivals: ${todaysFestivals.length}`);

  for (const fest of todaysFestivals) {
    const customerCount = await Customer.countDocuments({
      shop_id: fest.shop_id,
      deleted_at: null,
    });

    console.log(
      `    - ${fest.festival_name} | shop=${fest.shop_id} | customers=${customerCount}`,
    );
  }
  console.log(`\n🎂 Today's Wishes:`);
  console.log(`  birthday: ${birthdayCustomersToday.length}`);
  birthdayCustomersToday.forEach((c) =>
    console.log(`    - [Birthday] ${c.full_name} (${c.customer_id})`),
  );
  console.log(`  anniversary: ${anniversaryCustomersToday.length}`);
  anniversaryCustomersToday.forEach((c) =>
    console.log(`    - [Anniversary] ${c.full_name} (${c.customer_id})`),
  );

  // 🛠 Today's Service reminders (stage-based logic)
  const todayEnd = createDateRange(0).end; // today's end

  console.log(`\n🛠 Today's Service reminders (stage-based):`);

  const servicesToday = await ServiceSchedule.aggregate([
    {
      $match: {
        next_reminder_at: { $lte: todayEnd },
        status: { $nin: ["COMPLETED", "CANCELLED"] },
        deleted_at: null,
        shop_id: SHOP_ID,
      },
    },
    {
      $lookup: {
        from: "serviceplans",
        localField: "service_plan_id",
        foreignField: "_id",
        as: "servicePlan",
      },
    },
    {
      $unwind: {
        path: "$servicePlan",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "invoiceitems",
        localField: "servicePlan.invoice_item_id",
        foreignField: "_id",
        as: "invoiceItem",
      },
    },
    {
      $unwind: {
        path: "$invoiceItem",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "invoices",
        localField: "invoiceItem.invoice_id",
        foreignField: "_id",
        as: "invoice",
      },
    },
    {
      $unwind: {
        path: "$invoice",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "invoice.customer_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    {
      $unwind: {
        path: "$customer",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  // Group by reminder stage
  const groupedByStageToday = {};
  servicesToday.forEach((s) => {
    const stage = s.reminder_stage || "UNKNOWN";
    if (!groupedByStageToday[stage]) groupedByStageToday[stage] = [];
    groupedByStageToday[stage].push(s);
  });

  console.log(`  Total services to process: ${servicesToday.length}`);

  Object.entries(groupedByStageToday).forEach(([stage, services]) => {
    console.log(`  Stage [${stage}]: ${services.length}`);
    services.forEach((s) => {
      const customer = s.customer;
      const invoiceItem = s.invoiceItem;
      const linkStatus = s.servicePlan ? "linked" : "orphaned";
      const retryInfo = s.retry_count
        ? ` (retry ${s.retry_count}/${s.max_retries || 3})`
        : "";
      console.log(
        `    - ${s.service_schedule_id} [${linkStatus}${retryInfo}]: customer=${customer?.full_name || "unknown"}, product=${invoiceItem?.product_name || "unknown"}, scheduled=${s.scheduled_date.toISOString()}, next_reminder=${s.next_reminder_at?.toISOString() || "none"}`,
      );
      if (s.failure_reason) {
        console.log(`      ⚠️  Last failure: ${s.failure_reason}`);
      }
    });
  });

  // 💰 Today's Payment reminders
  console.log(`\n💰 Today's Payment reminders:`);

  // Today's due invoices
  const todaysDueInvoices = await Invoice.aggregate([
    {
      $match: {
        due_date: { $gte: todayRange.start, $lt: todayRange.end },
        payment_status: { $in: ["UNPAID", "PARTIAL"] },
        deleted_at: null,
        shop_id: SHOP_ID,
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "customer_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    {
      $unwind: {
        path: "$customer",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: { due_date: 1 },
    },
  ]);

  console.log(`  Due today: ${todaysDueInvoices.length}`);
  todaysDueInvoices.forEach((inv) => {
    const customer = inv.customer;
    console.log(
      `    - Invoice ${inv.invoice_number} customer=${customer?.full_name || "unknown"} amount_due=₹${inv.amount_due?.toFixed(2)} status=${inv.payment_status}`,
    );
  });

  // Overdue payment reminders (due_date in past)
  const overdueInvoicesToday = await Invoice.aggregate([
    {
      $match: {
        due_date: { $lt: todayRange.start },
        payment_status: { $in: ["UNPAID", "PARTIAL"] },
        deleted_at: null,
        shop_id: SHOP_ID,
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "customer_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    {
      $unwind: {
        path: "$customer",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: { due_date: 1 },
    },
  ]);

  console.log(`  Overdue: ${overdueInvoicesToday.length}`);
  overdueInvoicesToday.forEach((inv) => {
    const customer = inv.customer;
    const daysSinceDue = inv.due_date
      ? Math.ceil(
          (Date.now() - new Date(inv.due_date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : "unknown";
    console.log(
      `    - Invoice ${inv.invoice_number} customer=${customer?.full_name || "unknown"} due=${inv.due_date?.toISOString()} (${daysSinceDue} days overdue) amount_due=₹${inv.amount_due?.toFixed(2)} status=${inv.payment_status}`,
    );
  });

  // 🛡 Today's Warranty reminders
  const warrantyDays = [30, 15, 3];
  console.log(`\n🛡 Today's Warranty reminders:`);
  for (const days of warrantyDays) {
    const todayRangeWarranty = createDateRange(days);

    const items = await InvoiceItem.aggregate([
      {
        $match: {
          warranty_end_date: {
            $gte: todayRangeWarranty.start,
            $lt: todayRangeWarranty.end,
          },
          deleted_at: null,
          shop_id: SHOP_ID,
        },
      },
      {
        $lookup: {
          from: "invoices",
          localField: "invoice_id",
          foreignField: "_id",
          as: "invoice",
        },
      },
      {
        $unwind: {
          path: "$invoice",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "invoice.customer_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    const label =
      days === 30
        ? "30-DAY REMINDER"
        : days === 15
          ? "15-DAY REMINDER"
          : days === 3
            ? "3-DAY REMINDER"
            : `${days}-DAY`;

    console.log(`  Today - ${label}: ${items.length}`);
    items.forEach((i) => {
      const customer = i.customer;
      console.log(
        `    - [${label}] ${i.product_name} (item=${i.invoice_item_id}) 
       customer=${customer?.full_name || "n/a"} 
       warranty_end=${i.warranty_end_date?.toISOString()}`,
      );
    });
  }

  printSection("TOMORROW RUN");

  // 1. Wishes (Birthday + Anniversary) for tomorrow
  const ot = getTomorrowISTParts();
  console.log(`Tomorrow IST month/day: ${ot.month}/${ot.date}`);

  const birthdayCustomers = await Customer.aggregate([
    {
      $match: {
        date_of_birth: { $ne: null },
        deleted_at: null,
        shop_id: SHOP_ID,
      },
    },
    {
      $addFields: {
        month: { $month: "$date_of_birth" },
        day: { $dayOfMonth: "$date_of_birth" },
      },
    },
    { $match: { month: ot.month, day: ot.date } },
  ]);

  const anniversaryCustomers = await Customer.aggregate([
    {
      $match: {
        anniversary_date: { $exists: true, $ne: null },
        deleted_at: null,
        shop_id: SHOP_ID,
      },
    },
    {
      $addFields: {
        month: { $month: "$anniversary_date" },
        day: { $dayOfMonth: "$anniversary_date" },
      },
    },
    { $match: { month: ot.month, day: ot.date } },
  ]);

  const tomorrowRange = createDateRange(1);

  const tomorrowFestivals = await FestivalSchedule.find({
    schedule_date: {
      $gte: tomorrowRange.start,
      $lt: tomorrowRange.end,
    },
  });

  console.log(`  festivals: ${tomorrowFestivals.length}`);

  for (const fest of tomorrowFestivals) {
    const customerCount = await Customer.countDocuments({
      shop_id: fest.shop_id,
      deleted_at: null,
    });

    console.log(
      `    - ${fest.festival_name} | shop=${fest.shop_id} | customers=${customerCount}`,
    );
  }
  console.log("\n🎂 Wishes (tomorrow):");
  console.log(`  birthday: ${birthdayCustomers.length}`);
  birthdayCustomers.forEach((c) =>
    console.log(`    - [Birthday] ${c.full_name} (${c.customer_id})`),
  );
  console.log(`  anniversary: ${anniversaryCustomers.length}`);
  anniversaryCustomers.forEach((c) =>
    console.log(`    - [Anniversary] ${c.full_name} (${c.customer_id})`),
  );

  // 🛠 Services (tomorrow)
  const tomorrowEnd = createDateRange(1).end;

  console.log(`\n🛠 Service reminders (tomorrow run preview - stage-based):`);
  const servicesToProcess = await ServiceSchedule.aggregate([
    {
      $match: {
        next_reminder_at: { $lte: tomorrowEnd },
       status: { $nin: ["COMPLETED", "CANCELLED"] },
        deleted_at: null,
      },
    },
    {
      $lookup: {
        from: "serviceplans",
        localField: "service_plan_id",
        foreignField: "_id",
        as: "servicePlan",
      },
    },
    {
      $unwind: {
        path: "$servicePlan",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "invoiceitems",
        localField: "servicePlan.invoice_item_id",
        foreignField: "_id",
        as: "invoiceItem",
      },
    },
    {
      $unwind: {
        path: "$invoiceItem",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "invoices",
        localField: "invoiceItem.invoice_id",
        foreignField: "_id",
        as: "invoice",
      },
    },
    {
      $unwind: {
        path: "$invoice",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "invoice.customer_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    {
      $unwind: {
        path: "$customer",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        "invoice.shop_id": SHOP_ID,
      },
    },
  ]);

  // Group by reminder stage
  const groupedByStage = {};
  servicesToProcess.forEach((s) => {
    const stage = s.reminder_stage || "UNKNOWN";
    if (!groupedByStage[stage]) groupedByStage[stage] = [];
    groupedByStage[stage].push(s);
  });

  console.log(`  Total services to process: ${servicesToProcess.length}`);

  Object.entries(groupedByStage).forEach(([stage, services]) => {
    console.log(`  Stage [${stage}]: ${services.length}`);
    services.forEach((s) => {
      const customer = s.customer;
      const invoiceItem = s.invoiceItem;
      const linkStatus = s.servicePlan ? "linked" : "orphaned";
      const retryInfo = s.retry_count
        ? ` (retry ${s.retry_count}/${s.max_retries || 3})`
        : "";
      console.log(
        `    - ${s.service_schedule_id} [${linkStatus}${retryInfo}]: customer=${customer?.full_name || "unknown"}, product=${invoiceItem?.product_name || "unknown"}, scheduled=${s.scheduled_date.toISOString()}, next_reminder=${s.next_reminder_at?.toISOString() || "none"}`,
      );
      if (s.failure_reason) {
        console.log(`      ⚠️  Last failure: ${s.failure_reason}`);
      }
    });
  });

  // 🛡 Tomorrow's Warranty reminders
  console.log(`\n🛡 Tomorrow's Warranty reminders:`);
  for (const days of warrantyDays) {
    const tomorrowRangeForDays = createDateRange(days + 1);

    const items = await InvoiceItem.aggregate([
      {
        $match: {
          warranty_end_date: {
            $gte: tomorrowRangeForDays.start,
            $lt: tomorrowRangeForDays.end,
          },
          deleted_at: null,
          shop_id: SHOP_ID,
        },
      },
      {
        $lookup: {
          from: "invoices",
          localField: "invoice_id",
          foreignField: "_id",
          as: "invoice",
        },
      },
      {
        $unwind: {
          path: "$invoice",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "invoice.customer_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    const label =
      days === 30
        ? "30-DAY REMINDER"
        : days === 15
          ? "15-DAY REMINDER"
          : days === 3
            ? "3-DAY REMINDER"
            : `${days}-DAY`;

    console.log(`  Tomorrow - ${label}: ${items.length}`);
    items.forEach((i) => {
      const customer = i.customer;
      console.log(
        `    - [${label}] ${i.product_name} (item=${i.invoice_item_id}) 
       customer=${customer?.full_name || "n/a"} 
       warranty_end=${i.warranty_end_date?.toISOString()}`,
      );
    });
  }

  // 💰 Payment reminders: show due tomorrow and overdue invoices
  console.log(`\n💰 Tomorrow's Payment reminders:`);

  const tomorrowRangePayment = createDateRange(1);

  // Due tomorrow
  const dueTomorrowInvoices = await Invoice.aggregate([
    {
      $match: {
        due_date: {
          $gte: tomorrowRangePayment.start,
          $lt: tomorrowRangePayment.end,
        },
        payment_status: { $in: ["UNPAID", "PARTIAL"] },
        deleted_at: null,
        shop_id: SHOP_ID,
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "customer_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    {
      $unwind: {
        path: "$customer",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: { due_date: 1 },
    },
  ]);

  console.log(`  Due tomorrow: ${dueTomorrowInvoices.length}`);
  dueTomorrowInvoices.forEach((inv) => {
    const customer = inv.customer;
    console.log(
      `    - Invoice ${inv.invoice_number} customer=${customer?.full_name || "unknown"} amount_due=₹${inv.amount_due?.toFixed(2)} status=${inv.payment_status}`,
    );
  });

  // Overdue payment reminders (due_date in past)
  const overdueInvoicesTomorrow = await Invoice.aggregate([
    {
      $match: {
        due_date: { $lt: todayRange.start },
        payment_status: { $in: ["UNPAID", "PARTIAL"] },
        deleted_at: null,
        shop_id: SHOP_ID,
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "customer_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    {
      $unwind: {
        path: "$customer",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: { due_date: 1 },
    },
  ]);

  console.log(`  Overdue: ${overdueInvoicesTomorrow.length}`);
  overdueInvoicesTomorrow.forEach((inv) => {
    const customer = inv.customer;
    const daysSinceDue = inv.due_date
      ? Math.ceil(
          (Date.now() - new Date(inv.due_date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : "unknown";
    console.log(
      `    - Invoice ${inv.invoice_number} customer=${customer?.full_name || "unknown"} due=${inv.due_date?.toISOString()} (${daysSinceDue} days overdue) amount_due=₹${inv.amount_due?.toFixed(2)} status=${inv.payment_status}`,
    );
  });

  console.log("\n====== Completed today + tomorrow reminder preview ======\n");

  // 🚀 FIX 1: AUTO-CANCEL ORPHANED SERVICE SCHEDULES
  console.log("🔧 Running orphaned service schedule cleanup...");

  const orphaned = await ServiceSchedule.find({
    status: { $in: ["PENDING", "MISSED", "RESCHEDULED"] },
    deleted_at: null,
  }).populate({
    path: "service_plan_id",
    populate: {
      path: "invoice_item_id",
      populate: {
        path: "invoice_id",
        populate: { path: "customer_id" },
      },
    },
  });

  let deletedCount = 0;
  for (const s of orphaned) {
    if (!s?.service_plan_id?.invoice_item_id?.invoice_id?.customer_id) {
      await ServiceSchedule.findByIdAndDelete(s._id);

      console.log("Deleted orphaned:", s._id);
      deletedCount++;
    }
  }

  console.log(`✅ Cleanup complete: ${deletedCount} orphaned records deleted`);
};

const run = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb+srv://rahul:rahul10092002@cluster0.alfq874.mongodb.net/?appName=Cluster0";

    console.log("Connecting to MongoDB at", mongoUri);
    await mongoose.connect(mongoUri);

    console.log("Connected to MongoDB");

    await getSummary();
  } catch (error) {
    console.error("Failed to run tomorrow reminder preview:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
};

run();
