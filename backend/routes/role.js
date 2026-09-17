import { Router } from "express";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roleController.js";
import { authenticate, checkPermission } from "../middleware/auth.js";

export const roleRouter = Router();

// All routes require authentication
roleRouter.use(authenticate);

// List all roles
roleRouter.get("/", checkPermission("roles_view"), getRoles);

// Admin/Owner only routes for managing roles
roleRouter.post("/", checkPermission("roles_create"), createRole);
roleRouter.put("/:id", checkPermission("roles_create"), updateRole);
roleRouter.delete("/:id", checkPermission("roles_create"), deleteRole);
