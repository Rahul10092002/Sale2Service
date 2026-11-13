import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getStatus,
  getAuthUrl,
  handleCallback,
  exchangeCode,
  toggleAutoSync,
  disconnect,
  retrySync,
  syncSingleCustomer,
  getLogs,
} from "../controllers/googleContactsController.js";

const router = express.Router();

// Public OAuth browser callback from Google
router.get("/callback", handleCallback);

// Authenticated management endpoints
router.get("/status", authenticate, getStatus);
router.get("/auth-url", authenticate, getAuthUrl);
router.post("/exchange-code", authenticate, exchangeCode);
router.post("/toggle-auto-sync", authenticate, toggleAutoSync);
router.post("/disconnect", authenticate, disconnect);
router.post("/retry-sync", authenticate, retrySync);
router.post("/sync-customer/:customerId", authenticate, syncSingleCustomer);
router.get("/logs", authenticate, getLogs);

export const googleContactsRouter = router;
export default router;

