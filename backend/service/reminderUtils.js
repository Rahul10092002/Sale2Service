import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import ServicePlan from "../models/ServicePlan.js";
import ServiceSchedule from "../models/ServiceSchedule.js";
import InvoiceItem from "../models/InvoiceItem.js";
import Invoice from "../models/Invoice.js";
import FestivalSchedule from "../models/FestivalSchedule.js";
import ReminderLog from "../models/ReminderLog.js";
import {
  createDateRange,
  getISTDateParts,
  getISTTodayParts,
} from "../scheduler/core/utils.js";

/**
 * Get upcoming wishes (birthdays and anniversaries)
 */
export const getUpcomingWishes = async (shopId, period = "today") => {
  const wishes = [];
  
  // Decide how many days to look ahead
  let days = 0;
  if (period === "week") days = 7;
  if (period === "month") days = 30;

  // Get today's logs to show status
  const todayRange = createDateRange(0);
  const todayLogs = await ReminderLog.find({
    shop_id: shopId,
    entity_type: "CUSTOMER",
    createdAt: { $gte: todayRange.start, $lt: todayRange.end },
    deleted_at: null
  }).lean();

  const logMap = new Map();
  todayLogs.forEach(log => {
    logMap.set(log.entity_id, log.message_status);
  });

  for (let i = 0; i <= days; i++) {
    const range = createDateRange(i);
    const istParts = getISTDateParts(range.start);
    const label = i === 0 ? "today" : i === 1 ? "tomorrow" : `${i} days`;

    // Birthdays
    const birthdays = await Customer.aggregate([
      {
        $match: {
          date_of_birth: { $ne: null },
          deleted_at: null,
          shop_id: shopId,
        },
      },
      {
        $addFields: {
          month: { $month: "$date_of_birth" },
          day: { $dayOfMonth: "$date_of_birth" },
        },
      },
      { $match: { month: istParts.month, day: istParts.date } },
    ]);

    birthdays.forEach(c => {
      wishes.push({
        id: c._id,
        type: "birthday",
        customerName: c.full_name,
        customerPhone: c.whatsapp_number,
        date: range.start,
        daysUntil: i,
        label: "Birthday",
        reminderStatus: logMap.get(c.customer_id) || (i === 0 ? "PENDING" : null)
      });
    });

    // Anniversaries
    const anniversaries = await Customer.aggregate([
      {
        $match: {
          anniversary_date: { $exists: true, $ne: null },
          deleted_at: null,
          shop_id: shopId,
        },
      },
      {
        $addFields: {
          month: { $month: "$anniversary_date" },
          day: { $dayOfMonth: "$anniversary_date" },
        },
      },
      { $match: { month: istParts.month, day: istParts.date } },
    ]);

    anniversaries.forEach(c => {
      wishes.push({
        id: c._id,
        type: "anniversary",
        customerName: c.full_name,
        customerPhone: c.whatsapp_number,
        date: range.start,
        daysUntil: i,
        label: "Anniversary",
        reminderStatus: logMap.get(c.customer_id) || (i === 0 ? "PENDING" : null)
      });
    });
  }

  return wishes;
};

/**
 * Get upcoming festivals
 */
export const getUpcomingFestivals = async (shopId, period = "today") => {
  let days = 0;
  if (period === "week") days = 7;
  if (period === "month") days = 30;

  const startRange = createDateRange(0);
  const endRange = createDateRange(days);

  const festivals = await FestivalSchedule.find({
    shop_id: shopId,
    schedule_date: {
      $gte: startRange.start,
      $lt: endRange.end,
    },
    deleted_at: null
  }).sort({ schedule_date: 1 }).lean();

  // Get logs for festivals (often mapped to CUSTOMER or SERVICE in some systems, 
  // but let's check current date matching for today)
  const todayRange = createDateRange(0);
  const todayLogs = await ReminderLog.find({
    shop_id: shopId,
    createdAt: { $gte: todayRange.start, $lt: todayRange.end },
    deleted_at: null
  }).lean();

  return festivals.map(f => {
    // A bit harder for festivals as they reach many customers. 
    // We'll just check if any log exists for today with this festival name in content/template
    const sentToday = todayLogs.some(log => 
      log.template_name?.includes(f.festival_name) || 
      log.message_content?.includes(f.festival_name)
    );

    return {
      id: f._id,
      type: "festival",
      festivalName: f.festival_name,
      date: f.schedule_date,
      daysUntil: Math.ceil((f.schedule_date - new Date()) / (1000 * 60 * 60 * 24)),
      label: "Festival",
      reminderStatus: sentToday ? "SENT" : (period === "today" ? "PENDING" : null)
    };
  });
};

/**
 * Get upcoming services using stage-based logic
 */
export const getUpcomingServices = async (shopId, period = "today") => {
  let days = 0;
  if (period === "week") days = 7;
  if (period === "month") days = 30;

  const startRange = createDateRange(0);
  const endRange = createDateRange(days);
  
  // Get logs for today
  const todayLogs = await ReminderLog.find({
    shop_id: shopId,
    entity_type: "SERVICE",
    createdAt: { $gte: startRange.start, $lt: startRange.end },
    deleted_at: null
  }).lean();

  const logMap = new Map();
  todayLogs.forEach(log => {
    logMap.set(log.entity_id, log.message_status);
  });

  // Include COMPLETED services if period is today
  const statusFilter = ["PENDING", "MISSED", "RESCHEDULED"];
  if (period === "today") statusFilter.push("COMPLETED");

  // Get service plans for this shop to filter schedules (schedules don't have shop_id)
  const plans = await ServicePlan.find({ shop_id: shopId, deleted_at: null }).select("_id").lean();
  const planIds = plans.map(p => p._id);

  const services = await ServiceSchedule.aggregate([
    {
      $match: {
        deleted_at: null,
        service_plan_id: { $in: planIds },
        status: { $in: statusFilter },
        $or: [
          { scheduled_date: { $gte: startRange.start, $lt: endRange.end } },
          { scheduled_date: { $lt: startRange.start }, status: "PENDING" } // Overdue
        ]
      },
    },
    {
      $lookup: {
        from: "serviceplans",
        localField: "service_plan_id",
        foreignField: "_id",
        as: "plan",
      },
    },
    { $unwind: "$plan" },
    {
      $lookup: {
        from: "invoiceitems",
        localField: "plan.invoice_item_id",
        foreignField: "_id",
        as: "item",
      },
    },
    { $unwind: "$item" },
    {
      $lookup: {
        from: "invoices",
        localField: "item.invoice_id",
        foreignField: "_id",
        as: "invoice",
      },
    },
    { $unwind: "$invoice" },
    {
      $lookup: {
        from: "customers",
        localField: "invoice.customer_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },
    { $sort: { scheduled_date: 1 } }
  ]);

  return services.map(s => ({
    id: s._id,
    type: "service",
    serviceName: s.item.product_name,
    serviceNumber: s.service_number,
    customerName: s.customer.full_name,
    customerPhone: s.customer.whatsapp_number,
    date: s.scheduled_date,
    status: s.status,
    daysUntil: Math.ceil((s.scheduled_date - new Date()) / (1000 * 60 * 60 * 24)),
    reminder_stage: s.reminder_stage,
    reminderStatus: logMap.get(String(s._id)) || (period === "today" ? "PENDING" : null)
  }));
};

/**
 * Get upcoming warranties
 */
export const getUpcomingWarranties = async (shopId, period = "today") => {
  let days = 0;
  if (period === "week") days = 7;
  if (period === "month") days = 30;

  const startRange = createDateRange(0);
  const endRange = createDateRange(days);

  // Get logs for today
  const todayLogs = await ReminderLog.find({
    shop_id: shopId,
    entity_type: "PRODUCT",
    createdAt: { $gte: startRange.start, $lt: startRange.end },
    deleted_at: null
  }).lean();

  const logMap = new Map();
  todayLogs.forEach(log => {
    logMap.set(log.entity_id, log.message_status);
  });

  const items = await InvoiceItem.aggregate([
    {
      $match: {
        shop_id: shopId,
        warranty_end_date: { $gte: startRange.start, $lt: endRange.end },
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
    { $unwind: "$invoice" },
    {
      $lookup: {
        from: "customers",
        localField: "invoice.customer_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },
    { $sort: { warranty_end_date: 1 } }
  ]);

  return items.map(i => ({
    id: i._id,
    type: "warranty",
    productName: i.product_name,
    serialNumber: i.serial_number,
    customerName: i.customer.full_name,
    customerPhone: i.customer.whatsapp_number,
    date: i.warranty_end_date,
    daysUntil: Math.ceil((i.warranty_end_date - new Date()) / (1000 * 60 * 60 * 24)),
    reminderStatus: logMap.get(String(i._id)) || (period === "today" ? "PENDING" : null)
  }));
};

/**
 * Get upcoming payments
 */
export const getUpcomingPayments = async (shopId, period = "today") => {
  let days = 0;
  if (period === "week") days = 7;
  if (period === "month") days = 30;

  const startRange = createDateRange(0);
  const endRange = createDateRange(days);

  // Get logs for today
  const todayLogs = await ReminderLog.find({
    shop_id: shopId,
    entity_type: "INVOICE",
    createdAt: { $gte: startRange.start, $lt: startRange.end },
    deleted_at: null
  }).lean();

  const logMap = new Map();
  todayLogs.forEach(log => {
    logMap.set(log.entity_id, log.message_status);
  });

  const invoices = await Invoice.aggregate([
    {
      $match: {
        shop_id: shopId,
        payment_status: { $in: ["UNPAID", "PARTIAL"] },
        deleted_at: null,
        $or: [
          { due_date: { $gte: startRange.start, $lt: endRange.end } },
          { due_date: { $lt: startRange.start } } // Overdue
        ]
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
    { $unwind: "$customer" },
    { $sort: { due_date: 1 } }
  ]);

  return invoices.map(inv => ({
    id: inv._id,
    type: "payment",
    invoiceNumber: inv.invoice_number,
    amountDue: inv.amount_due,
    customerName: inv.customer.full_name,
    customerPhone: inv.customer.whatsapp_number,
    date: inv.due_date,
    status: inv.payment_status,
    daysUntil: Math.ceil((inv.due_date - new Date()) / (1000 * 60 * 60 * 24)),
    reminderStatus: logMap.get(String(inv._id)) || (period === "today" ? "PENDING" : null)
  }));
};

/**
 * Get recent activity including ReminderLogs
 */
export const getRecentReminderActivity = async (shopId, limit = 10) => {
  const logs = await ReminderLog.find({
    shop_id: shopId,
    deleted_at: null
  })
  .sort({ createdAt: -1 })
  .limit(limit);

  return logs.map(log => ({
    id: log._id,
    type: "reminder",
    title: `${log.entity_type} Reminder`,
    description: `Sent to ${log.recipient_name} (${log.message_status})`,
    status: log.message_status,
    timestamp: log.createdAt,
    meta: {
      recipient: log.recipient_number,
      content: log.message_content.substring(0, 50) + "..."
    }
  }));
};
