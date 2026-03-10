import express from "express";
import { serviceController } from "../controllers/serviceController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Removed unused routes: /dashboard, /schedules, /visits

// Get services organized by product
router.get(
  "/by-product",
  serviceController.getServicesByProduct.bind(serviceController),
);

// Reschedule a service
router.put(
  "/schedules/:id/reschedule",
  serviceController.rescheduleService.bind(serviceController),
);

// Mark a service as complete
router.put(
  "/schedules/:id/complete",
  serviceController.markServiceComplete.bind(serviceController),
);

// Cancel a service
router.put(
  "/schedules/:id/cancel",
  serviceController.cancelService.bind(serviceController),
);

// Removed unused routes: createServiceVisit, getServiceVisits

export default router;
