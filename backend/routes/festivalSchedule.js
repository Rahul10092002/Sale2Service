import { Router } from "express";
import { authenticate, authorize, checkPermission } from "../middleware/auth.js";
import FestivalScheduleController from "../controllers/festivalScheduleController.js";

export const festivalScheduleRouter = Router();
const festivalScheduleController = new FestivalScheduleController();

// Apply authentication to all routes
festivalScheduleRouter.use(authenticate);

// POST - Create festival schedule
festivalScheduleRouter.post(
  "/",
  checkPermission("schedules_create"),
  (req, res) => {
    return festivalScheduleController.createSchedule(req, res);
  },
);

// GET - Get all festival schedules with pagination and search
festivalScheduleRouter.get("/", checkPermission("schedules_view"), (req, res) => {
  return festivalScheduleController.getSchedules(req, res);
});

// GET - Get festival schedule by ID
festivalScheduleRouter.get("/:id", checkPermission("schedules_view"), (req, res) => {
  return festivalScheduleController.getScheduleById(req, res);
});

// PUT - Update festival schedule
festivalScheduleRouter.put(
  "/:id",
  checkPermission("schedules_edit"),
  (req, res) => {
    return festivalScheduleController.updateSchedule(req, res);
  },
);

// DELETE - Delete festival schedule
festivalScheduleRouter.delete(
  "/:id",
  checkPermission("schedules_delete"),
  (req, res) => {
    return festivalScheduleController.deleteSchedule(req, res);
  },
);
