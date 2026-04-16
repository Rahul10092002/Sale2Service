import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import ServiceVisit from "../models/ServiceVisit.js";
import ServiceSchedule from "../models/ServiceSchedule.js";
import ServicePlan from "../models/ServicePlan.js";
import InvoiceItem from "../models/InvoiceItem.js";
import ReminderLog from "../models/ReminderLog.js";
import * as reminderUtils from "./reminderUtils.js";
import { createDateRange } from "../scheduler/core/utils.js";

/**
 * Dashboard Service
 * Provides aggregated data for dashboard metrics and insights
 */

/**
 * Get date range based on period
 */
const getDateRange = (period) => {
  const todayRange = createDateRange(0);
  
  switch (period) {
    case "today":
      return todayRange;
    case "week":
      return {
        start: todayRange.start,
        end: createDateRange(7).end,
      };
    case "month":
      return {
        start: todayRange.start,
        end: createDateRange(30).end,
      };
    default:
      return todayRange;
  }
};

/**
 * Get revenue statistics
 */
export const getRevenueStats = async (shopId, period = "today") => {
  const { start, end } = getDateRange(period);

  // Current period revenue
  const currentRevenue = await Invoice.aggregate([
    {
      $match: {
        shop_id: shopId,
        invoice_date: { $gte: start, $lt: end },
        deleted_at: null,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$total_amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Previous period for comparison
  const periodLength = end - start;
  const prevStart = new Date(start.getTime() - periodLength);
  const prevEnd = start;

  const previousRevenue = await Invoice.aggregate([
    {
      $match: {
        shop_id: shopId,
        invoice_date: { $gte: prevStart, $lt: prevEnd },
        deleted_at: null,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$total_amount" },
      },
    },
  ]);

  const current = currentRevenue[0] || { total: 0, count: 0 };
  const previous = previousRevenue[0] || { total: 0 };

  const change =
    previous.total > 0
      ? ((current.total - previous.total) / previous.total) * 100
      : 0;

  return {
    total: current.total,
    count: current.count,
    previousTotal: previous.total,
    changePercentage: Math.round(change * 10) / 10,
  };
};

/**
 * Get invoice statistics
 */
export const getInvoiceStats = async (shopId, period = "today") => {
  const { start, end } = getDateRange(period);

  const stats = await Invoice.aggregate([
    {
      $match: {
        shop_id: shopId,
        invoice_date: { $gte: start, $lt: end },
        deleted_at: null,
      },
    },
    {
      $group: {
        _id: "$payment_status",
        count: { $sum: 1 },
        amount: { $sum: "$total_amount" },
      },
    },
  ]);

  const result = {
    total: 0,
    paid: { count: 0, amount: 0 },
    partial: { count: 0, amount: 0 },
    unpaid: { count: 0, amount: 0 },
  };

  stats.forEach((stat) => {
    result.total += stat.count;
    if (stat._id === "PAID") {
      result.paid = { count: stat.count, amount: stat.amount };
    } else if (stat._id === "PARTIAL") {
      result.partial = { count: stat.count, amount: stat.amount };
    } else if (stat._id === "UNPAID") {
      result.unpaid = { count: stat.count, amount: stat.amount };
    }
  });

  return result;
};

/**
 * Get customer statistics
 */
export const getCustomerStats = async (shopId, period = "today") => {
  const { start, end } = getDateRange(period);

  // Total customers
  const totalCustomers = await Customer.countDocuments({ 
    shop_id: shopId,
    deleted_at: null 
  });

  // New customers in period
  const newCustomers = await Customer.countDocuments({
    shop_id: shopId,
    createdAt: { $gte: start, $lt: end },
    deleted_at: null
  });

  // Active customers (with invoices in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeCustomerIds = await Invoice.distinct("customer_id", {
    shop_id: shopId,
    invoice_date: { $gte: thirtyDaysAgo },
    deleted_at: null,
  });

  return {
    total: totalCustomers,
    new: newCustomers,
    active: activeCustomerIds.length,
  };
};

/**
 * Get service visit statistics
 */
export const getServiceStats = async (shopId, period = "today") => {
  const { start, end } = getDateRange(period);

  const visits = await ServiceSchedule.aggregate([
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
      $match: {
        "plan.shop_id": shopId,
        "plan.deleted_at": null,
        deleted_at: null,
        scheduled_date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    completed: 0,
    scheduled: 0,
    cancelled: 0,
  };

  visits.forEach((visit) => {
    result.total += visit.count;
    if (visit._id === "COMPLETED") {
      result.completed = visit.count;
    } else if (visit._id === "SCHEDULED") {
      result.scheduled = visit.count;
    } else if (visit._id === "CANCELLED") {
      result.cancelled = visit.count;
    }
  });

  return result;
};

/**
 * Get service plan statistics
 */
export const getServicePlanStats = async (shopId) => {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const activePlans = await ServicePlan.countDocuments({
    shop_id: shopId,
    plan_status: "ACTIVE",
  });

  const expiringPlans = await ServicePlan.countDocuments({
    shop_id: shopId,
    plan_status: "ACTIVE",
    end_date: { $gte: now, $lte: thirtyDaysLater },
    deleted_at: null,
  });

  return {
    active: activePlans,
    expiring: expiringPlans,
  };
};

/**
 * Get revenue trend data for charts
 */
export const getRevenueTrend = async (shopId, days = 30) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const trendData = await Invoice.aggregate([
    {
      $match: {
        shop_id: shopId,
        invoice_date: { $gte: startDate, $lte: endDate },
        deleted_at: null,
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$invoice_date" },
          month: { $month: "$invoice_date" },
          day: { $dayOfMonth: "$invoice_date" },
        },
        revenue: { $sum: "$total_amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
    },
  ]);

  return trendData.map((item) => ({
    date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`,
    revenue: item.revenue,
    count: item.count,
  }));
};

/**
 * Get top products/services
 */
export const getTopProducts = async (shopId, limit = 5) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const topProducts = await Invoice.aggregate([
    {
      $match: {
        shop_id: shopId,
        invoice_date: { $gte: thirtyDaysAgo },
        deleted_at: null,
      },
    },
    {
      $lookup: {
        from: "invoiceitems",
        localField: "_id",
        foreignField: "invoice_id",
        as: "items",
      },
    },
    {
      $unwind: "$items",
    },
    {
      $group: {
        _id: "$items.product_name",
        quantity: { $sum: "$items.quantity" },
        revenue: {
          $sum: { $multiply: ["$items.quantity", "$items.unit_price"] },
        },
      },
    },
    {
      $sort: { revenue: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  return topProducts.map((item) => ({
    name: item._id,
    quantity: item.quantity,
    revenue: item.revenue,
  }));
};

/**
 * Get recent activity
 */
export const getRecentActivity = async (shopId, limit = 10) => {
  console.log("Fetching recent activity for shop:", shopId);
  const [recentInvoices, recentVisits, recentReminders] = await Promise.all([
    Invoice.find({ shop_id: shopId, deleted_at: null })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("customer_id", "full_name")
      .select("invoice_number total_amount payment_status createdAt"),
      
    ServiceVisit.find({ deleted_at: null })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: "service_schedule_id",
        populate: {
          path: "service_plan_id",
          match: { shop_id: shopId },
          populate: { path: "customer_id", select: "full_name" }
        }
      }),

    reminderUtils.getRecentReminderActivity(shopId, limit)
  ]);

  const activities = [
    ...recentInvoices.map((invoice) => ({
      type: "invoice",
      id: invoice._id,
      title: `Invoice ${invoice.invoice_number}`,
      description: `${invoice.customer_id?.full_name || "Customer"} - ₹${invoice.total_amount}`,
      status: invoice.payment_status,
      timestamp: invoice.createdAt,
    })),
    ...recentVisits
      .filter(v => v.service_schedule_id?.service_plan_id) // Match successful
      .map((visit) => ({
        type: "service",
        id: visit._id,
        title: "Service Visit",
        description: `${visit.service_schedule_id?.service_plan_id?.customer_id?.full_name || "Customer"} - ${visit.status}`,
        status: visit.status,
        timestamp: visit.createdAt,
      })),
    ...recentReminders
  ];
  
  return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
};

/**
 * Get alerts and notifications
 */
export const getAlerts = async (shopId) => {
  const alerts = [];
  const limit = 10;
  const now = new Date();

  // 1. Overdue invoices
  const overdueInvoiceList = await Invoice.find({
    shop_id: shopId,
    payment_status: { $in: ["UNPAID", "PARTIAL"] },
    due_date: { $lt: now },
    deleted_at: null,
  })
    .populate("customer_id", "full_name whatsapp_number")
    .select("invoice_number total_amount due_date payment_status customer_id")
    .sort({ due_date: 1 })
    .limit(limit);

  if (overdueInvoiceList.length > 0) {
    alerts.push({
      id: "overdue_invoices",
      type: "warning",
      category: "invoices",
      message: `${overdueInvoiceList.length} invoice${overdueInvoiceList.length > 1 ? "s" : ""} overdue — need follow-up`,
      count: overdueInvoiceList.length,
      items: overdueInvoiceList.map((inv) => ({
        id: inv._id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_id?.full_name || "Unknown",
        phone: inv.customer_id?.whatsapp_number || "",
        total_amount: inv.total_amount,
        due_date: inv.due_date,
        payment_status: inv.payment_status,
      })),
    });
  }

  // 2. Missed or overdue service visits
  const overdueServiceList = await ServiceSchedule.aggregate([
    {
      $match: {
        deleted_at: null,
        status: { $in: ["MISSED", "PENDING"] },
        scheduled_date: { $lt: now },
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
      $match: {
        "plan.shop_id": shopId,
        "plan.deleted_at": null,
      },
    },
    {
      $lookup: {
        from: "invoiceitems",
        localField: "plan.invoice_item_id",
        foreignField: "_id",
        as: "invoiceItem",
      },
    },
    { $unwind: "$invoiceItem" },
    {
      $lookup: {
        from: "invoices",
        localField: "invoiceItem.invoice_id",
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
    { $sort: { scheduled_date: 1 } },
    { $limit: limit },
    {
      $project: {
        _id: "$invoice._id",
        product_id: "$invoiceItem._id",
        invoice_number: "$invoice.invoice_number",
        customer_name: "$customer.full_name",
        phone: "$customer.whatsapp_number",
        product_name: "$invoiceItem.product_name",
        scheduled_date: 1,
        service_number: 1,
        status: 1,
      },
    },
  ]);

  if (overdueServiceList.length > 0) {
    alerts.push({
      id: "missed_services",
      type: "error",
      category: "service",
      message: `${overdueServiceList.length} service visit${overdueServiceList.length > 1 ? "s" : ""} missed or overdue`,
      count: overdueServiceList.length,
      items: overdueServiceList,
    });
  }

  // 3. Failed Reminder Messages
  const failedReminders = await ReminderLog.find({
    shop_id: shopId,
    message_status: "FAILED",
    deleted_at: null,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  })
  .limit(limit);

  if (failedReminders.length > 0) {
    alerts.push({
      id: "failed_reminders",
      type: "error",
      category: "reminder",
      message: `${failedReminders.length} reminder message${failedReminders.length > 1 ? "s" : ""} failed to send today`,
      count: failedReminders.length,
      items: failedReminders.map(log => ({
        id: log._id,
        customer_name: log.recipient_name,
        phone: log.recipient_number,
        error: log.failure_reason,
        type: log.entity_type
      }))
    });
  }

  // 4. Invoices missing due dates (if payment status is not PAID)
  const missingDueDateCount = await Invoice.countDocuments({
    shop_id: shopId,
    payment_status: { $in: ["UNPAID", "PARTIAL"] },
    due_date: null,
    deleted_at: null
  });

  if (missingDueDateCount > 0) {
    alerts.push({
      id: "missing_due_dates",
      type: "info",
      category: "invoices",
      message: `${missingDueDateCount} invoice${missingDueDateCount > 1 ? "s" : ""} missing due dates — cannot schedule reminders`,
      count: missingDueDateCount
    });
  }

  return alerts;
};

/**
 * Get comprehensive dashboard summary
 */
export const getDashboardSummary = async (shopId, period = "today") => {
  const [
    revenueStats,
    invoiceStats,
    customerStats,
    serviceStats,
    servicePlanStats,
    alerts,
    wishes,
    festivals
  ] = await Promise.all([
    getRevenueStats(shopId, period),
    getInvoiceStats(shopId, period),
    getCustomerStats(shopId, period),
    getServiceStats(shopId, period),
    getServicePlanStats(shopId),
    getAlerts(shopId),
    reminderUtils.getUpcomingWishes(shopId, period),
    reminderUtils.getUpcomingFestivals(shopId, period)
  ]);

  return {
    period,
    revenue: revenueStats,
    invoices: invoiceStats,
    customers: customerStats,
    services: serviceStats,
    servicePlans: servicePlanStats,
    alerts,
    wishes,
    festivals
  };
};

/**
 * Get payment method breakdown
 */
export const getPaymentMethodStats = async (shopId, period = "month") => {
  const { start, end } = getDateRange(period);

  const paymentStats = await Invoice.aggregate([
    {
      $match: {
        shop_id: shopId,
        invoice_date: { $gte: start, $lt: end },
        payment_status: "PAID",
        deleted_at: null,
      },
    },
    {
      $group: {
        _id: "$payment_mode",
        count: { $sum: 1 },
        amount: { $sum: "$total_amount" },
      },
    },
  ]);

  return paymentStats.map((stat) => ({
    method: stat._id,
    count: stat.count,
    amount: stat.amount,
  }));
};

/**
 * Get upcoming service reminders
 */
export const getUpcomingServiceReminders = async (shopId, period = "today") => {
  return reminderUtils.getUpcomingServices(shopId, period);
};

/**
 * Get upcoming warranty reminders
 */
export const getUpcomingWarrantyReminders = async (
  shopId,
  period = "today",
) => {
  return reminderUtils.getUpcomingWarranties(shopId, period);
};

/**
 * Get warranty expiring soon (within 30 days)
 */
export const getWarrantyExpiringStats = async (shopId) => {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [expiringThisWeek, expiringThisMonth, total] = await Promise.all([
    InvoiceItem.countDocuments({
      shop_id: shopId,
      warranty_end_date: { $gte: now, $lte: sevenDaysLater },
      deleted_at: null,
    }),
    InvoiceItem.countDocuments({
      shop_id: shopId,
      warranty_end_date: { $gte: now, $lte: thirtyDaysLater },
      deleted_at: null,
    }),
    InvoiceItem.countDocuments({
      shop_id: shopId,
      warranty_end_date: { $gte: now },
      deleted_at: null,
    }),
  ]);

  return {
    expiringThisWeek,
    expiringThisMonth,
    total,
  };
};
