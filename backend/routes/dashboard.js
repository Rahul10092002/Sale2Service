import express from "express";
import * as dashboardController from "../controllers/dashboardController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/**
 * Dashboard Routes
 * All routes require authentication
 */

// Get dashboard summary (all key metrics)
router.get("/summary", authenticate, dashboardController.getDashboardSummary);

// Get revenue trend data
router.get("/revenue-trend", authenticate, dashboardController.getRevenueTrend);

// Get top products
router.get("/top-products", authenticate, dashboardController.getTopProducts);

// Get recent activity
router.get(
  "/recent-activity",
  authenticate,
  dashboardController.getRecentActivity,
);

// Get payment method statistics
router.get(
  "/payment-methods",
  authenticate,
  dashboardController.getPaymentMethodStats,
);

// Get invoice statistics
router.get("/invoice-stats", authenticate, dashboardController.getInvoiceStats);

// Get upcoming service reminders
router.get(
  "/service-reminders",
  authenticate,
  dashboardController.getUpcomingServiceReminders,
);

// Get upcoming warranty reminders
router.get(
  "/warranty-reminders",
  authenticate,
  dashboardController.getUpcomingWarrantyReminders,
);

// Get warranty statistics
router.get(
  "/warranty-stats",
  authenticate,
  dashboardController.getWarrantyStats,
);

export default router;
