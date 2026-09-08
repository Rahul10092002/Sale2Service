import express from "express";
import { authenticate } from "../middleware/auth.js";
import { strictMutationRateLimiter } from "../middleware/rateLimiter.js";
import {
  createReceivingSlipIntake,
  getInventoryItems,
  linkRetroactiveDealer,
  updateInventoryStatus,
  getItemAuditLogs,
} from "../controllers/inventoryController.js";

const router = express.Router();

router.use(authenticate);

router.post("/receiving-slip", strictMutationRateLimiter, createReceivingSlipIntake);
router.get("/items", getInventoryItems);
router.put("/items/:itemId/link-dealer", strictMutationRateLimiter, linkRetroactiveDealer);
router.put("/items/:itemId/status", strictMutationRateLimiter, updateInventoryStatus);
router.get("/items/:itemId/logs", getItemAuditLogs);

export default router;
