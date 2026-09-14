import express from "express";
import { authenticate } from "../middleware/auth.js";
import { strictMutationRateLimiter } from "../middleware/rateLimiter.js";
import {
  createReceivingSlipIntake,
  updateReceivingSlip,
  getInventoryItems,
  getInventoryItemById,
  getReceivingSlipById,
  linkRetroactiveDealer,
  updateInventoryStatus,
  getItemAuditLogs,
  getPurchasesList,
} from "../controllers/inventoryController.js";

const router = express.Router();

router.use(authenticate);

router.post("/receiving-slip", strictMutationRateLimiter, createReceivingSlipIntake);
router.put("/receiving-slips/:id", strictMutationRateLimiter, updateReceivingSlip);
router.get("/purchases", getPurchasesList);
router.get("/items", getInventoryItems);
router.get("/items/:itemId", getInventoryItemById);
router.get("/receiving-slips/:id", getReceivingSlipById);
router.put("/items/:itemId/link-dealer", strictMutationRateLimiter, linkRetroactiveDealer);
router.put("/items/:itemId/status", strictMutationRateLimiter, updateInventoryStatus);
router.get("/items/:itemId/logs", getItemAuditLogs);

export default router;
