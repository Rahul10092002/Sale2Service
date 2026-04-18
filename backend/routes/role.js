import { Router } from "express";
import RoleController from "../controllers/roleController.js";
import { authenticate, authorize, checkPermission } from "../middleware/auth.js";

export const roleRouter = Router();
const roleController = new RoleController();

// All routes require authentication
roleRouter.use(authenticate);

// List all roles
roleRouter.get("/", checkPermission("roles_view"), (req, res) => roleController.getRoles(req, res));

// Admin/Owner only routes for managing roles
roleRouter.post("/", checkPermission("roles_create"), (req, res) =>
  roleController.createRole(req, res),
);

roleRouter.put("/:id", checkPermission("roles_create"), (req, res) =>
  roleController.updateRole(req, res),
);

roleRouter.delete("/:id", checkPermission("roles_create"), (req, res) =>
  roleController.deleteRole(req, res),
);
