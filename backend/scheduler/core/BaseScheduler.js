import ReminderLog from "../../models/ReminderLog.js";
import { formatPhoneNumber, isValidWhatsAppNumber } from "./utils.js";

/**
 * Base class for all scheduler services
 * Contains common functionality for reminder processing
 */
export default class BaseScheduler {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Check if a reminder has already been sent recently
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type (SERVICE, PRODUCT, INVOICE)
   * @param {string} templateName - Template name
   * @param {number} hoursBuffer - Hours to check back (default: 24)
   * @returns {boolean} - True if reminder already sent
   */
  async isReminderAlreadySent(
    entityId,
    entityType,
    templateName,
    hoursBuffer = 24,
    shopId = null,
  ) {
    const query = {
      entity_id: String(entityId),
      entity_type: entityType,
      template_name: templateName,
      message_status: { $in: ["SENT", "DELIVERED"] },
      createdAt: {
        $gte: new Date(Date.now() - hoursBuffer * 60 * 60 * 1000),
      },
    };
    if (shopId != null && shopId !== undefined) {
      query.shop_id = shopId;
    }

    const existingLog = await ReminderLog.findOne(query);

    return !!existingLog;
  }

  /**
   * Validate customer and phone number
   * @param {Object} customer - Customer object
   * @returns {Object} - Validation result with isValid flag and formattedNumber
   */
  validateCustomerPhoneNumber(customer) {
    if (!customer || !customer.whatsapp_number) {
      return {
        isValid: false,
        error: "Customer or WhatsApp number not found",
      };
    }

    const formattedNumber = formatPhoneNumber(customer.whatsapp_number);

    if (!isValidWhatsAppNumber(formattedNumber)) {
      return {
        isValid: false,
        error: `Invalid WhatsApp number: ${customer.whatsapp_number}`,
      };
    }

    return {
      isValid: true,
      formattedNumber,
    };
  }

  /**
   * Create a reminder log entry
   * @param {Object} logData - Log data
   * @returns {Object} - Created reminder log
   */
  async createReminderLog(logData) {
    const reminderLog = new ReminderLog({
      entity_id: logData.entityId,
      entity_type: logData.entityType,
      shop_id: logData.shopId,
      recipient_number: logData.recipientNumber,
      recipient_name: logData.recipientName,
      message_content: logData.messageContent || "",
      template_name: logData.templateName,
    });

    return await reminderLog.save();
  }

  /**
   * Log error with context
   * @param {string} operation - Operation name
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  logError(operation, error, context = {}) {
    console.error(`[${this.constructor.name}] ${operation} error:`, {
      error: error.message,
      stack: error.stack,
      context,
    });
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} context - Additional context
   */
  logInfo(message, context = {}) {
    console.log(`[${this.constructor.name}] ${message}`, context);
  }
}
