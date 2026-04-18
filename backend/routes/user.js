import { Router } from "express";
import UserController from "../controllers/userController.js";
import { authenticate, authorize, checkPermission } from "../middleware/auth.js";

export const userRouter = Router();
const userController = new UserController();

// All routes require authentication
userRouter.use(authenticate);

// Add user
userRouter.post("/", checkPermission("users_create"), (req, res) =>
  userController.addUser(req, res),
);

// List all users
userRouter.get("/", checkPermission("users_view"), (req, res) => userController.listUsers(req, res));

// Get user by ID
userRouter.get("/:id", checkPermission("users_view"), (req, res) => userController.getUserById(req, res));

// Update user
userRouter.put("/:id", checkPermission("users_edit"), (req, res) =>
  userController.updateUser(req, res),
);

// Delete user
userRouter.delete("/:id", checkPermission("users_delete"), (req, res) =>
  userController.deleteUser(req, res),
);
