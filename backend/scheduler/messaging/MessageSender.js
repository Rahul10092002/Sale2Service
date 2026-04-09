import { sendWhatsappMessageViaMSG91 } from "../../config/msg91.js";
import ReminderLog from "../../models/ReminderLog.js";

/**
 * Centralized message sender using MSG91 only
 * Simplifies WhatsApp messaging by using a single provider
 */
export default class MessageSender {
  /**
   * Send WhatsApp message using MSG91 template
   * @param {Object} params - Message parameters
   * @param {string} params.to - Phone number
   * @param {string} params.templateName - MSG91 template name
   * @param {Object|Array} params.variables - Template variables
   * @param {string} params.reminderLogId - Reminder log ID for tracking
   * @param {Object} params.metadata - Additional metadata
   * @returns {Object} - Send result
   */
  async sendTemplateMessage({
    to,
    templateName,
    variables = {},
    buttons = [],
    reminderLogId = null,
    metadata = {},
  }) {
    try {
      // Convert variables to array if it's an object
      const componentArray = Array.isArray(variables)
        ? variables
        : Object.values(variables || {});

      // Prepare MSG91 payload
      const msg91Params = {
        templateName,
        to,
        components: componentArray,
        buttons: buttons,
        campaignName: metadata.campaignName || templateName,
        hospitalId: metadata.shopId || null,
        userName: metadata.customerName || "",
        messageType: metadata.messageType || templateName,
      };

      // Send via MSG91
      const sendResult = await sendWhatsappMessageViaMSG91(msg91Params);

      // Update reminder log on success
      if (reminderLogId && sendResult) {
        await this.updateReminderLogSuccess(reminderLogId, sendResult);
      }

      return {
        success: true,
        result: sendResult,
        provider: "MSG91",
      };
    } catch (error) {
      console.error("MessageSender template send error:", error);

      // Update reminder log on failure
      if (reminderLogId) {
        await this.updateReminderLogFailure(reminderLogId, error);
      }

      return {
        success: false,
        error: error.message,
        provider: "MSG91",
      };
    }
  }

  /**
   * Send simple text message (non-template)
   * @param {Object} params - Message parameters
   * @param {string} params.to - Phone number
   * @param {string} params.message - Text message
   * @param {string} params.reminderLogId - Reminder log ID for tracking
   * @returns {Object} - Send result
   */
  async sendTextMessage({ to, message, reminderLogId = null }) {
    try {
      // For text messages, we could use MSG91's text endpoint
      // For now, we'll focus on template messages as that's the primary use case

      console.warn(
        "Text messages not implemented - use template messages instead",
      );
      return {
        success: false,
        error: "Text messages not supported - use template messages",
      };
    } catch (error) {
      console.error("MessageSender text send error:", error);

      if (reminderLogId) {
        await this.updateReminderLogFailure(reminderLogId, error);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update reminder log with success status
   * @param {string} reminderLogId - Reminder log ID
   * @param {Object} sendResult - Send result from MSG91
   */
  async updateReminderLogSuccess(reminderLogId, sendResult) {
    try {
      const updateData = {
        message_status: "SENT",
        sent_at: new Date(),
      };

      // Extract provider message ID from various possible response formats
      if (sendResult) {
        const providerId =
          sendResult.data?.[0]?.message_id ||
          sendResult.message_id ||
          sendResult.messages?.[0]?.id ||
          null;

        if (providerId) {
          updateData.provider_message_id = providerId;
        }
      }

      await ReminderLog.findByIdAndUpdate(reminderLogId, updateData);
    } catch (error) {
      console.error("Failed to update reminder log success:", error);
    }
  }

  /**
   * Update reminder log with failure status
   * @param {string} reminderLogId - Reminder log ID
   * @param {Error} error - Error object
   */
  async updateReminderLogFailure(reminderLogId, error) {
    try {
      await ReminderLog.findByIdAndUpdate(reminderLogId, {
        message_status: "FAILED",
        failure_reason: error.message || error.toString(),
        $inc: { retry_count: 1 },
      });
    } catch (updateError) {
      console.error("Failed to update reminder log failure:", updateError);
    }
  }

  /**
   * Validate MSG91 configuration
   * @returns {boolean} - True if MSG91 is properly configured
   */
  static isConfigured() {
    return !!(
      process.env.MSG91_API_ENDPOINT &&
      process.env.MSG91_AUTHKEY &&
      process.env.MSG91_NUMBER &&
      process.env.MSG91_NAMESPACE
    );
  }
}
