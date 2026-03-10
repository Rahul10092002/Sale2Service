import { Router } from "express";
import UserController from "../controllers/userController.js";
import { authenticate, authorize } from "../middleware/auth.js";

export const userRouter = Router();
const userController = new UserController();

// All routes require authentication
userRouter.use(authenticate);

// Add user (OWNER and ADMIN can add users)
userRouter.post("/", authorize("OWNER", "ADMIN"), (req, res) =>
  userController.addUser(req, res),
);

// List all users (All authenticated users can view)
userRouter.get("/", (req, res) => userController.listUsers(req, res));

// Get user by ID
userRouter.get("/:id", (req, res) => userController.getUserById(req, res));

// Delete user (OWNER and ADMIN can delete)
userRouter.delete("/:id", authorize("OWNER", "ADMIN"), (req, res) =>
  userController.deleteUser(req, res),
);
