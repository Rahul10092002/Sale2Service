import { Router } from "express";
import { handleMsg91WhatsappWebhook } from "../controllers/webhookController.js";
import { applyCampaignWebhook, webhookAuthorized } from "../services/diwaliCampaignService.js";

export const webhookRouter = Router();

// Recommended campaign callback: authenticated and never runs legacy invoice updates.
webhookRouter.post("/msg91/diwali", async (req, res) => {
  if (!webhookAuthorized(req)) return res.status(503).json({ success: false, message: "Webhook authentication required" });
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    for (const event of events) if (event && typeof event === "object") await applyCampaignWebhook(event);
    res.json({ success: true });
  } catch {
    res.status(503).json({ success: false, message: "Delivery tracking temporarily unavailable" });
  }
});

// MSG91 WhatsApp Webhook endpoints
webhookRouter.post("/msg91", handleMsg91WhatsappWebhook);
webhookRouter.get("/msg91", (req, res) => {
  res.status(200).send("MSG91 WhatsApp Webhook Endpoint Active");
});
