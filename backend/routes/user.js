import { Router } from "express";
import {
  addUser,
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { authenticate, checkPermission } from "../middleware/auth.js";

export const userRouter = Router();

// All routes require authentication
userRouter.use(authenticate);

userRouter.post("/", checkPermission("users_create"), addUser);
userRouter.get("/", checkPermission("users_view"), listUsers);
userRouter.get("/:id", checkPermission("users_view"), getUserById);
userRouter.put("/:id", checkPermission("users_edit"), updateUser);
userRouter.delete("/:id", checkPermission("users_delete"), deleteUser);
