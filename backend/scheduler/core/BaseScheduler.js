import mongoose from "mongoose";
import ReminderLog from "../../models/ReminderLog.js";
import { formatPhoneNumber, isValidWhatsAppNumber } from "./utils.js";

function normalizeShopObjectId(shopId) {
  if (shopId == null || shopId === "") return null;
  if (shopId instanceof mongoose.Types.ObjectId) return shopId;
  try {
    return new mongoose.Types.ObjectId(shopId);
  } catch {
    return null;
  }
}

/**
 * Base class for all scheduler services
 * Contains common functionality for reminder processing
 */
export default class BaseScheduler {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Check if a reminder has already been sent recently (scoped by shop and optional recipient).
   * Same WhatsApp number may exist under different shops; shop_id + entity_id (and phone when provided)
   * avoids one shop suppressing another's send. Legacy logs without shop_id still dedupe per entity.
   *
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type (SERVICE, PRODUCT, INVOICE, CUSTOMER)
   * @param {string} templateName - Template name
   * @param {number} hoursBuffer - Hours to check back (default: 24)
   * @param {mongoose.Types.ObjectId|string|null|undefined} shopId - Shop scope
   * @param {string|null} recipientNumber - Normalized recipient (e.g. from validateCustomerPhoneNumber)
   * @returns {boolean} - True if reminder already sent
   */
  async isReminderAlreadySent(
    entityId,
    entityType,
    templateName,
    hoursBuffer = 24,
    shopId = null,
    recipientNumber = null,
  ) {
    const query = {
      entity_id: String(entityId),
      entity_type: entityType,
      template_name: templateName,
      message_status: { $in: ["SENT", "DELIVERED", "READ"] },
      createdAt: {
        $gte: new Date(Date.now() - hoursBuffer * 60 * 60 * 1000),
      },
    };

    const phone =
      typeof recipientNumber === "string" && recipientNumber.trim() !== ""
        ? recipientNumber.trim()
        : null;
    if (phone) {
      query.recipient_number = phone;
    }

    const shopOid = normalizeShopObjectId(shopId);
    if (shopOid) {
      query.$or = [
        { shop_id: shopOid },
        { shop_id: null },
        { shop_id: { $exists: false } },
      ];
    }

    const existingLog = await ReminderLog.findOne(query);

    return !!existingLog;
  }

  /**
   * Bulk check sent reminder logs for a list of entity IDs to optimize 5k+ batch queries.
   * Reduces DB queries from N to 1 per batch.
   *
   * @param {Array<string>} entityIds - Array of entity IDs
   * @param {string|Object} templateName - Template name or regex/query
   * @param {number} hoursBuffer - Buffer in hours (default: 24)
   * @param {mongoose.Types.ObjectId|string|null} shopId - Shop scope
   * @returns {Promise<Set<string>>} - Set of sent keys ("entity_id:template_name" or "entity_id:phone:template_name")
   */
  async getSentReminderLogsBatch(
    entityIds = [],
    templateName = null,
    hoursBuffer = 24,
    shopId = null,
  ) {
    if (!entityIds || entityIds.length === 0) return new Set();

    const query = {
      entity_id: { $in: entityIds.map(String) },
      message_status: { $in: ["SENT", "DELIVERED", "READ"] },
      createdAt: {
        $gte: new Date(Date.now() - hoursBuffer * 60 * 60 * 1000),
      },
    };

    if (templateName) {
      query.template_name = templateName;
    }

    const shopOid = normalizeShopObjectId(shopId);
    if (shopOid) {
      query.$or = [
        { shop_id: shopOid },
        { shop_id: null },
        { shop_id: { $exists: false } },
      ];
    }

    const logs = await ReminderLog.find(query)
      .select("entity_id recipient_number template_name")
      .lean();

    const sentSet = new Set();
    for (const log of logs) {
      const tName = log.template_name || "";
      sentSet.add(`${log.entity_id}:${tName}`);
      if (log.recipient_number) {
        sentSet.add(`${log.entity_id}:${log.recipient_number}:${tName}`);
      }
    }
    return sentSet;
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
