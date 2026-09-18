import express from "express";
import { authenticate, checkPermission } from "../middleware/auth.js";
import { strictMutationRateLimiter } from "../middleware/rateLimiter.js";
import {
  getRecycleBinItems,
  restoreItem,
  permanentlyDeleteItem,
  emptyRecycleBin,
} from "../controllers/recycleBinController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", checkPermission("settings_view"), getRecycleBinItems);
router.put("/restore", strictMutationRateLimiter, checkPermission("settings_edit"), restoreItem);
router.delete("/permanent", strictMutationRateLimiter, checkPermission("settings_edit"), permanentlyDeleteItem);
router.delete("/empty", strictMutationRateLimiter, checkPermission("settings_edit"), emptyRecycleBin);

export default router;
