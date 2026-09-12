import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  lookupWarranty,
  getWarrantySuggestions,
} from "../controllers/warrantyController.js";

const router = express.Router();

router.use(authenticate);

router.get("/lookup", lookupWarranty);
router.get("/suggestions", getWarrantySuggestions);

export default router;
