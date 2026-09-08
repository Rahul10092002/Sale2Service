import express from "express";
import { authenticate } from "../middleware/auth.js";
import { strictMutationRateLimiter } from "../middleware/rateLimiter.js";
import {
  getDealers,
  getAllDealersHistory,
  createDealer,
  updateDealer,
  deleteDealer,
} from "../controllers/dealerController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getDealers);
router.get("/all-history", getAllDealersHistory);
router.post("/", strictMutationRateLimiter, createDealer);
router.put("/:id", strictMutationRateLimiter, updateDealer);
router.delete("/:id", strictMutationRateLimiter, deleteDealer);

export default router;
