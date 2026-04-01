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
import {
  createDateRange,
  getISTDateParts,
  getISTTodayParts,
} from "../scheduler/core/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const tomorrowRange = createDateRange(1);

const getTomorrowISTParts = () => getISTDateParts(tomorrowRange.start);

const getSummary = async () => {
  console.log("\n====== Tomorrow Reminder Preview ======");
  console.log(
    `Tomorrow IST window: ${tomorrowRange.start.toISOString()} → ${tomorrowRange.end.toISOString()}`,
  );

  // 1. Wishes (Birthday + Anniversary) for tomorrow
  const ot = getTomorrowISTParts();
  console.log(`Tomorrow IST month/day: ${ot.month}/${ot.date}`);

  const birthdayCustomers = await Customer.aggregate([
    { $match: { date_of_birth: { $ne: null }, deleted_at: null } },
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

  console.log(`\nWishes (tomorrow):`);
  console.log(`  birthday: ${birthdayCustomers.length}`);
  birthdayCustomers.forEach((c) =>
    console.log(`    - [Birthday] ${c.full_name} (${c.customer_id})`),
  );
  console.log(`  anniversary: ${anniversaryCustomers.length}`);
  anniversaryCustomers.forEach((c) =>
    console.log(`    - [Anniversary] ${c.full_name} (${c.customer_id})`),
  );

  // 2. Service reminders that would be triggered in tomorrow run
  // Tomorrow's run will check services at 1 day and 3 days from tomorrow → 2 and 4 days from today
  const serviceRanges = [
    {
      label: "2-day service (tomorrow 1-day prior)",
      range: createDateRange(2),
    },
    {
      label: "4-day service (tomorrow 3-day prior)",
      range: createDateRange(4),
    },
  ];

  console.log(`\nService reminders (tomorrow run preview):`);
  for (const item of serviceRanges) {
    // Use aggregation with $lookup to safely handle null service_plan_id references
    const services = await ServiceSchedule.aggregate([
      {
        $match: {
          scheduled_date: { $gte: item.range.start, $lt: item.range.end },
          status: "PENDING",
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
    ]);

    console.log(`  ${item.label}: ${services.length}`);
    services.forEach((s) => {
      const customer = s.customer;
      const invoiceItem = s.invoiceItem;
      const status = s.servicePlan ? "linked" : "orphaned";
      console.log(
        `    - Service schedule ${s.service_schedule_id} [${status}]: customer=${customer?.full_name || "unknown"}, product=${invoiceItem?.product_name || "unknown"}, planned=${s.scheduled_date.toISOString()}`,
      );
    });
  }

  // 3. Warranty reminders for today and tomorrow preview
  const warrantyDays = [30, 15, 3];
  console.log(`\nWarranty reminders (today+tomorrow run preview):`);
  for (const days of warrantyDays) {
    const todayRange = createDateRange(days); // what you get in today's run
    const tomorrowRangeForDays = createDateRange(days + 1); // what tomorrow's run will get

    const findByRange = async (title, range) => {
      const items = await InvoiceItem.aggregate([
        {
          $match: {
            warranty_end_date: { $gte: range.start, $lt: range.end },
            deleted_at: null,
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

      console.log(`  ${title} - ${days}-day reminder: ${items.length}`);
      items.forEach((i) => {
        const customer = i.customer;
        console.log(
          `    - ${i.product_name} (item=${i.invoice_item_id}) customer=${customer?.full_name || "n/a"} warranty_end=${i.warranty_end_date?.toISOString()}`,
        );
      });
    };

    await findByRange("today run (current day)", todayRange);
    await findByRange("tomorrow run", tomorrowRangeForDays);
  }

  // 4. Payment reminders: show all upcoming (within 30 days) and overdue invoices
  console.log(`\nPayment reminders (tomorrow run preview):`);

  // Get today and 30 days from today
  const todayRange = createDateRange(0);
  const thirtyDaysRange = createDateRange(30);

  // Upcoming payment due reminders (due_date in future)
  const upcomingInvoices = await Invoice.aggregate([
    {
      $match: {
        due_date: { $gte: todayRange.start, $lt: thirtyDaysRange.end },
        payment_status: { $in: ["UNPAID", "PARTIAL"] },
        deleted_at: null,
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

  console.log(
    `  Upcoming payment reminders (next 30 days): ${upcomingInvoices.length}`,
  );
  upcomingInvoices.forEach((inv) => {
    const customer = inv.customer;
    const daysUntilDue = inv.due_date
      ? Math.ceil(
          (new Date(inv.due_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
      : "unknown";
    console.log(
      `    - Invoice ${inv.invoice_number} customer=${customer?.full_name || "unknown"} due=${inv.due_date?.toISOString()} (${daysUntilDue} days) amount_due=₹${inv.amount_due?.toFixed(2)} status=${inv.payment_status}`,
    );
  });

  // Overdue payment reminders (due_date in past)
  const overdueInvoices = await Invoice.aggregate([
    {
      $match: {
        due_date: { $lt: todayRange.start },
        payment_status: { $in: ["UNPAID", "PARTIAL"] },
        deleted_at: null,
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

  console.log(`  Overdue payment reminders: ${overdueInvoices.length}`);
  overdueInvoices.forEach((inv) => {
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

  console.log("\n====== Completed tomorrow reminder preview ======\n");
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
