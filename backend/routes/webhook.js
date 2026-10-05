import { Router } from "express";
import { handleMsg91WhatsappWebhook } from "../controllers/webhookController.js";

export const webhookRouter = Router();

// MSG91 WhatsApp Webhook endpoints
webhookRouter.post("/msg91", handleMsg91WhatsappWebhook);
webhookRouter.get("/msg91", (req, res) => {
  res.status(200).send("MSG91 WhatsApp Webhook Endpoint Active");
});
