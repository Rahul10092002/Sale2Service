import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import ServiceVisit from "../models/ServiceVisit.js";
import ServiceSchedule from "../models/ServiceSchedule.js";
import ServicePlan from "../models/ServicePlan.js";
import InvoiceItem from "../models/InvoiceItem.js";

/**
 * Dashboard Service
 * Provides aggregated data for dashboard metrics and insights
 */

/**
 * Get date range based on period
 */
const getDateRange = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "today":
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    case "week":
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return {
        start: weekStart,
        end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      };
    case "month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    default:
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
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
  const totalCustomers = await Customer.countDocuments({ shop_id: shopId });

  // New customers in period
  const newCustomers = await Customer.countDocuments({
    shop_id: shopId,
    createdAt: { $gte: start, $lt: end },
  });

  // Active customers (with invoices in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeCustomerIds = await Invoice.distinct("customer_id", {
    shop_id: shopId,
    invoice_date: { $gte: thirtyDaysAgo },
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

  // Get service schedules for this shop
  const schedules = await ServiceSchedule.find({ shop_id: shopId }).select(
    "_id",
  );
  const scheduleIds = schedules.map((s) => s._id);

  // Service visits in period
  const visits = await ServiceVisit.aggregate([
    {
      $match: {
        service_schedule_id: { $in: scheduleIds },
        visit_date: { $gte: start, $lt: end },
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
  const recentInvoices = await Invoice.find({ shop_id: shopId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("customer_id", "full_name")
    .select("invoice_number total_amount payment_status createdAt");

  return recentInvoices.map((invoice) => ({
    type: "invoice",
    id: invoice._id,
    title: `Invoice ${invoice.invoice_number}`,
    description: `${invoice.customer_id?.full_name || "Customer"} - ₹${invoice.total_amount}`,
    status: invoice.payment_status,
    timestamp: invoice.createdAt,
  }));
};

/**
 * Get alerts and notifications
 */
export const getAlerts = async (shopId) => {
  const alerts = [];

  // Overdue invoices
  const overdueInvoiceList = await Invoice.find({
    shop_id: shopId,
    payment_status: { $in: ["UNPAID", "PARTIAL"] },
    due_date: { $lt: new Date() },
    deleted_at: null,
  })
    .populate("customer_id", "full_name whatsapp_number")
    .select("invoice_number total_amount due_date payment_status customer_id")
    .sort({ due_date: 1 })
    .limit(10);

  const overdueInvoices = overdueInvoiceList.length;

  if (overdueInvoices > 0) {
    alerts.push({
      type: "warning",
      category: "invoices",
      message: `${overdueInvoices} invoice${overdueInvoices > 1 ? "s" : ""} with payment overdue — need follow-up`,
      count: overdueInvoices,
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

  // Missed or overdue service visits
  const overdueServiceList = await ServiceSchedule.find({
    deleted_at: null,
    status: { $in: ["MISSED", "PENDING"] },
    scheduled_date: { $lt: new Date() },
  })
    .populate({
      path: "service_plan_id",
      select: "invoice_item_id shop_id",
      match: { shop_id: shopId, deleted_at: null },
      populate: {
        path: "invoice_item_id",
        select: "_id product_name invoice_id",
        populate: {
          path: "invoice_id",
          select: "invoice_number customer_id",
          populate: {
            path: "customer_id",
            select: "full_name whatsapp_number",
          },
        },
      },
    })
    .sort({ scheduled_date: 1 })
    .limit(10);

  // Filter to this shop only (match on populate doesn't exclude parent docs)
  const shopServiceList = overdueServiceList.filter(
    (s) => s.service_plan_id?.shop_id?.toString() === shopId.toString(),
  );

  if (shopServiceList.length > 0) {
    alerts.push({
      type: "error",
      category: "service",
      message: `${shopServiceList.length} service visit${shopServiceList.length > 1 ? "s" : ""} missed or overdue`,
      count: shopServiceList.length,
      items: shopServiceList.map((s) => {
        const invoiceItem = s.service_plan_id?.invoice_item_id;
        const invoice = invoiceItem?.invoice_id;
        const customer = invoice?.customer_id;
        return {
          id: invoice?._id,
          product_id: invoiceItem?._id,
          invoice_number: invoice?.invoice_number || "",
          customer_name: customer?.full_name || "Unknown",
          phone: customer?.whatsapp_number || "",
          product_name: invoiceItem?.product_name || "Unknown product",
          scheduled_date: s.scheduled_date,
          service_number: s.service_number,
          status: s.status,
        };
      }),
    });
  }

  // Service plans expiring soon
  const expiringPlans = await ServicePlan.countDocuments({
    shop_id: shopId,
    plan_status: "ACTIVE",
    end_date: {
      $gte: new Date(),
      $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  if (expiringPlans > 0) {
    alerts.push({
      type: "info",
      category: "service",
      message: `${expiringPlans} service plan${expiringPlans > 1 ? "s" : ""} expiring this week`,
      count: expiringPlans,
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
  ] = await Promise.all([
    getRevenueStats(shopId, period),
    getInvoiceStats(shopId, period),
    getCustomerStats(shopId, period),
    getServiceStats(shopId, period),
    getServicePlanStats(shopId),
    getAlerts(shopId),
  ]);

  return {
    period,
    revenue: revenueStats,
    invoices: invoiceStats,
    customers: customerStats,
    services: serviceStats,
    servicePlans: servicePlanStats,
    alerts,
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
  const { start, end } = getDateRange(period);

  // Get service plans for this shop
  const servicePlans = await ServicePlan.find({
    shop_id: shopId,
    plan_status: "ACTIVE",
    deleted_at: null,
  }).populate("customer_id", "full_name whatsapp_number");

  const servicePlanIds = servicePlans.map((p) => p._id);

  // Get service schedules due in the period
  const upcomingServices = await ServiceSchedule.find({
    service_plan_id: { $in: servicePlanIds },
    scheduled_date: { $gte: start, $lt: end },
    status: { $in: ["PENDING", "RESCHEDULED"] },
    deleted_at: null,
  })
    .populate({
      path: "service_plan_id",
      populate: {
        path: "customer_id",
        select: "full_name whatsapp_number",
      },
    })
    .sort({ scheduled_date: 1 });

  return upcomingServices.map((schedule) => ({
    id: schedule._id,
    type: "service",
    serviceName: schedule.service_plan_id?.plan_name || "Service",
    customerName: schedule.service_plan_id?.customer_id?.full_name || "Unknown",
    customerPhone: schedule.service_plan_id?.customer_id?.whatsapp_number || "",
    scheduledDate: schedule.scheduled_date,
    serviceNumber: schedule.service_number,
    status: schedule.status,
    daysUntil: Math.ceil(
      (schedule.scheduled_date - new Date()) / (1000 * 60 * 60 * 24),
    ),
  }));
};

/**
 * Get upcoming warranty reminders
 */
export const getUpcomingWarrantyReminders = async (
  shopId,
  period = "today",
) => {
  const { start, end } = getDateRange(period);

  // Get invoice items with warranties expiring in the period
  const expiringWarranties = await InvoiceItem.find({
    shop_id: shopId,
    warranty_end_date: { $gte: start, $lt: end },
    deleted_at: null,
  })
    .populate({
      path: "invoice_id",
      select: "customer_id invoice_number invoice_date",
      populate: {
        path: "customer_id",
        select: "full_name whatsapp_number",
      },
    })
    .sort({ warranty_end_date: 1 });

  return expiringWarranties.map((item) => ({
    id: item._id,
    type: "warranty",
    productName: item.product_name,
    serialNumber: item.serial_number,
    customerName: item.invoice_id?.customer_id?.full_name || "Unknown",
    customerPhone: item.invoice_id?.customer_id?.whatsapp_number || "",
    warrantyEndDate: item.warranty_end_date,
    warrantyType: item.warranty_type,
    invoiceNumber: item.invoice_id?.invoice_number || "",
    daysUntil: Math.ceil(
      (item.warranty_end_date - new Date()) / (1000 * 60 * 60 * 24),
    ),
  }));
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
