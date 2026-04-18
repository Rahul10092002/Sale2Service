import express from "express";
import { serviceController } from "../controllers/serviceController.js";
import { authenticate, checkPermission } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);


// Get services organized by product
router.get(
  "/by-product",
  checkPermission("schedules_view"),
  serviceController.getServicesByProduct.bind(serviceController),
);

// Reschedule a service
router.put(
  "/schedules/:id/reschedule",
  checkPermission("schedules_edit"),
  serviceController.rescheduleService.bind(serviceController),
);

// Mark a service as complete
router.put(
  "/schedules/:id/complete",
  checkPermission("schedules_edit"),
  serviceController.markServiceComplete.bind(serviceController),
);

// Cancel a service
router.put(
  "/schedules/:id/cancel",
  checkPermission("schedules_edit"),
  serviceController.cancelService.bind(serviceController),
);

// Removed unused routes: createServiceVisit, getServiceVisits

export default router;
