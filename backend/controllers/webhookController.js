import MessageLog from "../models/MessageLog.js";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";

/**
 * Handle incoming MSG91 WhatsApp Delivery Report (DLR) Webhook
 * MSG91 posts status updates (submitted, sent, delivered, read, failed)
 */
export const handleMsg91WhatsappWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    console.log("[MSG91 Webhook] Received status payload:", JSON.stringify(payload));

    // MSG91 DLR payloads can come as an object or array of status events
    const events = Array.isArray(payload) ? payload : [payload];

    for (const evt of events) {
      const requestId = evt.request_id || evt.requestId || evt.uuid || evt.id;
      const destination = evt.mobile || evt.to || evt.destination || evt.number;
      const rawStatus = (evt.status || evt.state || "").toLowerCase();
      const reason = evt.reason || evt.error || evt.failure_reason || null;

      let normalizedStatus = "sent";
      if (rawStatus.includes("read")) normalizedStatus = "read";
      else if (rawStatus.includes("deliver")) normalizedStatus = "delivered";
      else if (rawStatus.includes("fail") || rawStatus.includes("reject") || rawStatus.includes("undeliver")) normalizedStatus = "failed";
      else if (rawStatus.includes("sent") || rawStatus.includes("submit")) normalizedStatus = "sent";

      // 1. Update MessageLog entry
      if (requestId || destination) {
        const query = {};
        if (requestId) query["meta.response.request_id"] = requestId;
        else if (destination) query.destination = new RegExp(destination.slice(-10), "i");

        await MessageLog.updateMany(query, {
          status: normalizedStatus === "read" || normalizedStatus === "delivered" ? "success" : normalizedStatus === "failed" ? "failed" : "success",
          $set: {
            "meta.delivery_status": normalizedStatus,
            "meta.delivery_reason": reason,
            "meta.webhook_received_at": new Date(),
          },
        }).catch(() => {});
      }

      // 2. Update Invoice WhatsApp delivery status if matching customer
      if (destination) {
        const cleanPhone = destination.replace(/[^\d]/g, "").slice(-10);
        const customer = await Customer.findOne({
          whatsapp_number: new RegExp(cleanPhone, "i"),
          deleted_at: null,
        });

        if (customer) {
          const updateObj = {
            whatsapp_sent: normalizedStatus !== "failed",
            whatsapp_status: normalizedStatus.toUpperCase(),
          };
          if (normalizedStatus === "delivered") updateObj.whatsapp_delivered_at = new Date();
          if (normalizedStatus === "read") updateObj.whatsapp_read_at = new Date();

          await Invoice.updateMany(
            { customer_id: customer._id, deleted_at: null },
            { $set: updateObj }
          ).catch(() => {});
        }
      }
    }

    res.status(200).json({ success: true, message: "MSG91 Webhook processed successfully" });
  } catch (err) {
    console.error("[MSG91 Webhook Error]:", err);
    res.status(200).json({ success: false, message: "Webhook payload logged" });
  }
};
