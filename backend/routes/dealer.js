import express from "express";
import { authenticate } from "../middleware/auth.js";
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
router.post("/", createDealer);
router.put("/:id", updateDealer);
router.delete("/:id", deleteDealer);

export default router;
