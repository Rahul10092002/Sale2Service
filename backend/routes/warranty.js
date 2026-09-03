import express from "express";
import { authenticate } from "../middleware/auth.js";
import { lookupWarranty } from "../controllers/warrantyController.js";

const router = express.Router();

router.use(authenticate);

router.get("/lookup", lookupWarranty);

export default router;
