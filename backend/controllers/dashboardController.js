import * as dashboardService from "../service/dashboardService.js";
import mongoose from "mongoose";

/**
 * Dashboard Controller
 * Handles requests for dashboard data and metrics
 */

/**
 * Get dashboard summary with all key metrics
 * GET /api/dashboard/summary
 */
export const getDashboardSummary = async (req, res) => {
  try {
    const { period = "today" } = req.query;
    const shopId = req.user.shopId;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID is required",
      });
    }

    const summary = await dashboardService.getDashboardSummary(
      new mongoose.Types.ObjectId(shopId),
      period,
    );

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard summary",
      error: error.message,
    });
  }
};

/**
 * Get revenue trend data for charts
 * GET /api/dashboard/revenue-trend
 */
export const getRevenueTrend = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const shopId = req.user.shopId;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID is required",
      });
    }

    const trendData = await dashboardService.getRevenueTrend(
      new mongoose.Types.ObjectId(shopId),
      parseInt(days),
    );

    res.json({
      success: true,
      data: trendData,
    });
  } catch (error) {
    console.error("Error fetching revenue trend:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching revenue trend",
      error: error.message,
    });
  }
};

/**
 * Get top products
 * GET /api/dashboard/top-products
 */
export const getTopProducts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const shopId = req.user.shopId;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID is required",
      });
    }

    const topProducts = await dashboardService.getTopProducts(
      new mongoose.Types.ObjectId(shopId),
      parseInt(limit),
    );

    res.json({
      success: true,
      data: topProducts,
    });
  } catch (error) {
    console.error("Error fetching top products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching top products",
      error: error.message,
    });
  }
};

/**
 * Get recent activity
 * GET /api/dashboard/recent-activity
 */
export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const shopId = req.user.shopId;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID is required",
      });
    }

    const activities = await dashboardService.getRecentActivity(
      new mongoose.Types.ObjectId(shopId),
      parseInt(limit),
    );

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent activity",
      error: error.message,
    });
  }
};

/**
 * Get payment method statistics
 * GET /api/dashboard/payment-methods
 */
export const getPaymentMethodStats = async (req, res) => {
  try {
    const { period = "month" } = req.query;
    const shopId = req.user.shopId;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID is required",
      });
    }

    const paymentStats = await dashboardService.getPaymentMethodStats(
      new mongoose.Types.ObjectId(shopId),
      period,
    );

    res.json({
      success: true,
      data: paymentStats,
    });
  } catch (error) {
    console.error("Error fetching payment method stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment method stats",
      error: error.message,
    });
  }
};

/**
 * Get invoice statistics
 * GET /api/dashboard/invoice-stats
 */
export const getInvoiceStats = async (req, res) => {
  try {
    const { period = "today" } = req.query;
    const shopId = req.user.shopId;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID is required",
      });
    }

    const stats = await dashboardService.getInvoiceStats(
      new mongoose.Types.ObjectId(shopId),
      period,
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching invoice stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching invoice stats",
      error: error.message,
    });
  }
};

/**
 * Get upcoming service reminders
 * GET /api/dashboard/service-reminders
 */
export const getUpcomingServiceReminders = async (req, res) => {
  try {
    const { period = "today" } = req.query;
    const shopId = req.user.shopId;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID is required",
      });
    }

    const reminders = await dashboardService.getUpcomingServiceReminders(
      new mongoose.Types.ObjectId(shopId),
      period,
    );

    res.json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    console.error("Error fetching service reminders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching service reminders",
      error: error.message,
    });
  }
};

/**
 * Get upcoming warranty reminders
 * GET /api/dashboard/warranty-reminders
 */
export const getUpcomingWarrantyReminders = async (req, res) => {
  try {
    const { period = "today" } = req.query;
    const shopId = req.user.shopId;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID is required",
      });
    }

    const reminders = await dashboardService.getUpcomingWarrantyReminders(
      new mongoose.Types.ObjectId(shopId),
      period,
    );

    res.json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    console.error("Error fetching warranty reminders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching warranty reminders",
      error: error.message,
    });
  }
};

/**
 * Get warranty expiring statistics
 * GET /api/dashboard/warranty-stats
 */
export const getWarrantyStats = async (req, res) => {
  try {
    const shopId = req.user.shopId;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID is required",
      });
    }

    const stats = await dashboardService.getWarrantyExpiringStats(
      new mongoose.Types.ObjectId(shopId),
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching warranty stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching warranty stats",
      error: error.message,
    });
  }
};
