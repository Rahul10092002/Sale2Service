import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import FestivalScheduleController from "../controllers/festivalScheduleController.js";

export const festivalScheduleRouter = Router();
const festivalScheduleController = new FestivalScheduleController();

// Apply authentication to all routes
festivalScheduleRouter.use(authenticate);

// POST - Create festival schedule
festivalScheduleRouter.post(
  "/",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => {
    return festivalScheduleController.createSchedule(req, res);
  },
);

// GET - Get all festival schedules with pagination and search
festivalScheduleRouter.get("/", (req, res) => {
  return festivalScheduleController.getSchedules(req, res);
});

// GET - Get festival schedule by ID
festivalScheduleRouter.get("/:id", (req, res) => {
  return festivalScheduleController.getScheduleById(req, res);
});

// PUT - Update festival schedule
festivalScheduleRouter.put(
  "/:id",
  authorize("OWNER", "ADMIN", "STAFF"),
  (req, res) => {
    return festivalScheduleController.updateSchedule(req, res);
  },
);

// DELETE - Delete festival schedule
festivalScheduleRouter.delete(
  "/:id",
  authorize("OWNER", "ADMIN"),
  (req, res) => {
    return festivalScheduleController.deleteSchedule(req, res);
  },
);
