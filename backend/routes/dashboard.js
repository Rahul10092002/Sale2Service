import express from "express";
import * as dashboardController from "../controllers/dashboardController.js";
import { authenticate, checkPermission } from "../middleware/auth.js";

const router = express.Router();

/**
 * Dashboard Routes
 * All routes require authentication
 */

router.use(authenticate, checkPermission("dashboard_view"));

// Get dashboard summary (all key metrics)
router.get("/summary", dashboardController.getDashboardSummary);

// Get revenue trend data
router.get("/revenue-trend", dashboardController.getRevenueTrend);

// Get top products
router.get("/top-products", dashboardController.getTopProducts);

// Get recent activity
router.get(
  "/recent-activity",
  dashboardController.getRecentActivity,
);

// Get payment method statistics
router.get(
  "/payment-methods",
  dashboardController.getPaymentMethodStats,
);

// Get invoice statistics
router.get("/invoice-stats", dashboardController.getInvoiceStats);

// Get upcoming service reminders
router.get(
  "/service-reminders",
  dashboardController.getUpcomingServiceReminders,
);

// Get upcoming warranty reminders
router.get(
  "/warranty-reminders",
  dashboardController.getUpcomingWarrantyReminders,
);

// Get warranty statistics
router.get(
  "/warranty-stats",
  dashboardController.getWarrantyStats,
);

export default router;
