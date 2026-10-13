import MessageLog from "../models/MessageLog.js";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import ReminderLog from "../models/ReminderLog.js";

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
      const requestId =
        evt.requestId ||
        evt.request_id ||
        evt.uuid ||
        evt.id ||
        evt.oneApiRequestId ||
        evt.campaignRequestId ||
        evt.crqid;
      const destination =
        evt.customerNumber ||
        evt.mobile ||
        evt.to ||
        evt.destination ||
        evt.number;
      const rawStatus = (
        evt.eventName ||
        evt.status ||
        evt.state ||
        evt.statusCode ||
        ""
      ).toLowerCase();
      const reason =
        evt.reason ||
        evt.error ||
        evt.failure_reason ||
        evt.cleverTapErrorReason ||
        evt.moEngageErrorCode ||
        evt.webEngangeErrorCode ||
        null;
      const content = evt.content || evt.text || null;
      const templateName = evt.templateName || evt.campaignName || null;

      let normalizedStatus = "sent";
      if (rawStatus.includes("read")) normalizedStatus = "read";
      else if (rawStatus.includes("deliver")) normalizedStatus = "delivered";
      else if (
        rawStatus.includes("fail") ||
        rawStatus.includes("reject") ||
        rawStatus.includes("undeliver")
      )
        normalizedStatus = "failed";
      else if (rawStatus.includes("sent") || rawStatus.includes("submit"))
        normalizedStatus = "sent";

      console.log(
        `[MSG91 Webhook] Event: ${rawStatus} -> ${normalizedStatus}, Dest: ${destination}, ReqId: ${requestId}${content ? `, Content: "${content.slice(0, 100)}"` : ""}`
      );

      // 1. Update MessageLog entry
      if (requestId || destination) {
        const queryConditions = [];
        if (requestId) {
          queryConditions.push(
            { "meta.response.request_id": requestId },
            { "meta.response.requestId": requestId },
            { "meta.response.uuid": requestId },
            { "meta.response.data.0.message_id": requestId },
            { "meta.response.data.message_id": requestId },
          );
        }

        let query = queryConditions.length > 0 ? { $or: queryConditions } : null;
        if (!query && destination) {
          const cleanPhone = destination.replace(/[^\d]/g, "").slice(-10);
          query = { destination: new RegExp(cleanPhone, "i") };
        }

        const updateData = {
          status:
            normalizedStatus === "read" || normalizedStatus === "delivered"
              ? "success"
              : normalizedStatus === "failed"
                ? "failed"
                : "success",
          $set: {
            "meta.delivery_status": normalizedStatus,
            "meta.delivery_reason": reason,
            "meta.webhook_received_at": new Date(),
          },
        };

        if (content) {
          updateData.$set.content = content;
          updateData.$set["meta.content"] = content;
        }

        if (templateName) {
          updateData.$set["meta.template_name"] = templateName;
        }

        let updateResult = null;
        if (query) {
          updateResult = await MessageLog.updateMany(query, updateData).catch(() => {});
        }

        // If no match found by requestId, fallback to updating the most recent log for destination
        if (
          (!updateResult || updateResult.matchedCount === 0) &&
          requestId &&
          destination
        ) {
          const cleanPhone = destination.replace(/[^\d]/g, "").slice(-10);
          const recentLog = await MessageLog.findOne({
            destination: new RegExp(cleanPhone, "i"),
          }).sort({ createdAt: -1 });

          if (recentLog) {
            updateResult = await MessageLog.updateOne(
              { _id: recentLog._id },
              updateData,
            ).catch(() => {});
          }
        }

        // If no existing log exists and content is present, record as a new log
        if (
          destination &&
          content &&
          (!updateResult || updateResult.matchedCount === 0)
        ) {
          await MessageLog.create({
            destination: destination.replace(/[^\d]/g, ""),
            userName: evt.customerName || evt.userName || "",
            status: normalizedStatus === "failed" ? "failed" : "success",
            messageType: evt.messageType || (evt.direction === "inbound" ? "inbound" : "whatsapp"),
            content,
            meta: {
              content,
              delivery_status: normalizedStatus,
              delivery_reason: reason,
              webhook_received_at: new Date(),
              raw_event: evt,
            },
          }).catch(() => {});
        }

        // Sync with ReminderLog for scheduler tracking
        const reminderQuery = {};
        if (requestId) {
          reminderQuery.$or = [
            { provider_message_id: requestId },
            { reminder_log_id: requestId },
          ];
        } else if (destination) {
          const cleanPhone = destination.replace(/[^\d]/g, "").slice(-10);
          reminderQuery.recipient_number = new RegExp(cleanPhone, "i");
        }

        const reminderUpdate = {};
        if (normalizedStatus === "delivered") {
          reminderUpdate.message_status = "DELIVERED";
          reminderUpdate.delivered_at = new Date();
        } else if (normalizedStatus === "read") {
          reminderUpdate.message_status = "READ";
        } else if (
          normalizedStatus === "failed" ||
          (reason && /spam|rate limit|131048/i.test(reason))
        ) {
          reminderUpdate.message_status = "FAILED";
          reminderUpdate.failure_reason = reason || "Delivery failed via webhook";
        }

        if (content) {
          reminderUpdate.message_content = content;
        }

        if (Object.keys(reminderUpdate).length > 0) {
          const remResult = await ReminderLog.updateMany(reminderQuery, {
            $set: reminderUpdate,
          }).catch(() => {});

          if (
            (!remResult || remResult.matchedCount === 0) &&
            requestId &&
            destination
          ) {
            const cleanPhone = destination.replace(/[^\d]/g, "").slice(-10);
            const recentRem = await ReminderLog.findOne({
              recipient_number: new RegExp(cleanPhone, "i"),
            }).sort({ createdAt: -1 });

            if (recentRem) {
              await ReminderLog.updateOne(
                { _id: recentRem._id },
                { $set: reminderUpdate },
              ).catch(() => {});
            }
          }
        }
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
          if (normalizedStatus === "delivered")
            updateObj.whatsapp_delivered_at = new Date();
          if (normalizedStatus === "read")
            updateObj.whatsapp_read_at = new Date();

          await Invoice.updateMany(
            { customer_id: customer._id, deleted_at: null },
            { $set: updateObj },
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
