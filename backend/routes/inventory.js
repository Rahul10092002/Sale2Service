import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createReceivingSlipIntake,
  getInventoryItems,
  linkRetroactiveDealer,
  updateInventoryStatus,
  getItemAuditLogs,
} from "../controllers/inventoryController.js";

const router = express.Router();

router.use(authenticate);

router.post("/receiving-slip", createReceivingSlipIntake);
router.get("/items", getInventoryItems);
router.put("/items/:itemId/link-dealer", linkRetroactiveDealer);
router.put("/items/:itemId/status", updateInventoryStatus);
router.get("/items/:itemId/logs", getItemAuditLogs);

export default router;
