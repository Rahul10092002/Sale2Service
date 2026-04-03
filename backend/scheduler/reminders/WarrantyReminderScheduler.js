import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import InvoiceItem from "../../models/InvoiceItem.js";
import Shop from "../../models/Shop.js";
import {
  createDateRange,
  getShopName,
  getShopContactInfo,
} from "../core/utils.js";
/**
 * Warranty-specific reminder scheduler
 * Handles warranty expiry and expired reminders
 */
export default class WarrantyReminderScheduler extends BaseScheduler {
  constructor() {
    super();
    this.messageSender = new MessageSender();
  }

  /**
   * Preload shops for a set of invoice items to avoid N+1 queries
   * @param {Array} invoiceItems
   * @returns {Object} shopMap by shop_id
   */
  async getShopMapForInvoiceItems(invoiceItems) {
    const shopIds = [
      ...new Set(
        invoiceItems
          .map((item) => item.invoice_id.shop_id)
          .filter((shopId) => shopId != null),
      ),
    ];

    if (shopIds.length === 0) return {};

    const shops = await Shop.find({ _id: { $in: shopIds } });
    return shops.reduce((map, shop) => {
      map[String(shop._id)] = shop;
      return map;
    }, {});
  }

  /**
   * Process all warranty reminders
   */
  async processWarrantyReminders() {
    try {
      this.logInfo("Processing warranty reminders...");

      await Promise.all([
        this.processWarrantyExpiry(),
        this.processExpiredWarranties(),
      ]);

      this.logInfo("Warranty reminders processing completed");
    } catch (error) {
      this.logError("processWarrantyReminders", error);
    }
  }

  /**
   * Process warranty expiry reminders (30, 15, 3 days before expiry)
   */
  async processWarrantyExpiry() {
    try {
      const reminderDays = [30, 15, 3];

      for (const days of reminderDays) {
        const dateRange = createDateRange(days);

        const expiringWarranties = await InvoiceItem.find({
          warranty_end_date: {
            $gte: dateRange.start,
            $lt: dateRange.end,
          },
          deleted_at: null,
        }).populate({
          path: "invoice_id",
          populate: {
            path: "customer_id",
          },
        });

        this.logInfo(
          `Found ${expiringWarranties.length} warranties expiring in ${days} days`,
        );

        const shopMap = await this.getShopMapForInvoiceItems(expiringWarranties);
        await Promise.all(
          expiringWarranties.map((item) =>
            this.sendWarrantyExpiryReminder(item, days, shopMap[String(item.invoice_id.shop_id)]),
          ),
        );
      }
    } catch (error) {
      this.logError("processWarrantyExpiry", error);
    }
  }

  /**
   * Process expired warranty reminders (day after expiry)
   */
  async processExpiredWarranties() {
    try {
      const yesterdayRange = createDateRange(-1);

      const expiredWarranties = await InvoiceItem.find({
        warranty_end_date: {
          $gte: yesterdayRange.start,
          $lt: yesterdayRange.end,
        },
        deleted_at: null,
      }).populate({
        path: "invoice_id",
        populate: {
          path: "customer_id",
        },
      });

      this.logInfo(
        `Found ${expiredWarranties.length} recently expired warranties`,
      );

      const shopMap = await this.getShopMapForInvoiceItems(expiredWarranties);
      await Promise.all(
        expiredWarranties.map((item) =>
          this.sendWarrantyExpiredReminder(item, shopMap[String(item.invoice_id.shop_id)]),
        ),
      );
    } catch (error) {
      this.logError("processExpiredWarranties", error);
    }
  }

  /**
   * Send warranty expiry reminder
   * @param {Object} invoiceItem - Invoice item object
   * @param {number} daysUntilExpiry - Days until warranty expires
   * @param {Object} cachedShop - Preloaded shop object
   */
  async sendWarrantyExpiryReminder(invoiceItem, daysUntilExpiry, cachedShop = null) {
    try {
      // Validate invoice item structure
      if (!invoiceItem.invoice_id?.customer_id) {
        this.logError(
          "sendWarrantyExpiryReminder",
          new Error("Invalid invoice item structure"),
          {
            itemId: invoiceItem.invoice_item_id,
          },
        );
        return;
      }

      const customer = invoiceItem.invoice_id.customer_id;
      const templateName = "warranty_expiring";

      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError(
          "sendWarrantyExpiryReminder",
          new Error(phoneValidation.error),
          {
            customer: customer.full_name,
            itemId: invoiceItem.invoice_item_id,
          },
        );
        return;
      }

      const alreadySent = await this.isReminderAlreadySent(
        invoiceItem.invoice_item_id,
        "PRODUCT",
        templateName,
        24,
        invoiceItem.invoice_id.shop_id,
        phoneValidation.formattedNumber,
      );

      if (alreadySent) {
        this.logInfo(
          `Warranty expiry reminder already sent for item ${invoiceItem.invoice_item_id}`,
        );
        return;
      }

      // Prepare template variables for warranty_expiring
      // Based on Hindi template: customer_name, product_name, days_remaining, contact_info, shop_name
      const variables = await this.getWarrantyTemplateVariables(
        invoiceItem,
        daysUntilExpiry,
        cachedShop,
      );

      // Create reminder log
      const reminderLog = await this.createReminderLog({
        entityId: invoiceItem.invoice_item_id,
        entityType: "PRODUCT",
        shopId: invoiceItem.invoice_id.shop_id,
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent: `Warranty expiry reminder for ${invoiceItem.product_name} (${daysUntilExpiry} days remaining)`,
        templateName: templateName,
      });

      // Send WhatsApp message
      const result = await this.messageSender.sendTemplateMessage({
        to: phoneValidation.formattedNumber,
        templateName: templateName,
        variables: variables,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: "warranty_expiry",
          customerName: customer.full_name,
          messageType: "warranty_expiry",
        },
      });

      if (result.success) {
        this.logInfo(`Warranty expiry reminder sent successfully`, {
          customer: customer.full_name,
          product: invoiceItem.product_name,
          daysUntilExpiry,
        });
      } else {
        this.logError("sendWarrantyExpiryReminder", new Error(result.error), {
          customer: customer.full_name,
          itemId: invoiceItem.invoice_item_id,
        });
      }
    } catch (error) {
      this.logError("sendWarrantyExpiryReminder", error, {
        itemId: invoiceItem.invoice_item_id,
        daysUntilExpiry,
      });
    }
  }

  /**
   * Send warranty expired reminder
   * @param {Object} invoiceItem - Invoice item object
   * @param {Object} cachedShop - Preloaded shop object
   */
  async sendWarrantyExpiredReminder(invoiceItem, cachedShop = null) {
    try {
      // Validate invoice item structure
      if (!invoiceItem.invoice_id?.customer_id) {
        this.logError(
          "sendWarrantyExpiredReminder",
          new Error("Invalid invoice item structure"),
          {
            itemId: invoiceItem.invoice_item_id,
          },
        );
        return;
      }

      const customer = invoiceItem.invoice_id.customer_id;
      const templateName = "warranty_expired";

      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError(
          "sendWarrantyExpiredReminder",
          new Error(phoneValidation.error),
          {
            customer: customer.full_name,
            itemId: invoiceItem.invoice_item_id,
          },
        );
        return;
      }

      const alreadySent = await this.isReminderAlreadySent(
        invoiceItem.invoice_item_id,
        "PRODUCT",
        templateName,
        24,
        invoiceItem.invoice_id.shop_id,
        phoneValidation.formattedNumber,
      );

      if (alreadySent) {
        this.logInfo(
          `Warranty expired reminder already sent for item ${invoiceItem.invoice_item_id}`,
        );
        return;
      }

      // Prepare template variables for warranty_expired
      // Based on Hindi template: customer_name, product_name, contact_info, shop_name
      const variables = await this.getWarrantyTemplateVariables(invoiceItem, null, cachedShop);

      // Create reminder log
      const reminderLog = await this.createReminderLog({
        entityId: invoiceItem.invoice_item_id,
        entityType: "PRODUCT",
        shopId: invoiceItem.invoice_id.shop_id,
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent: `Warranty expired reminder for ${invoiceItem.product_name}`,
        templateName: templateName,
      });

      // Send WhatsApp message
      const result = await this.messageSender.sendTemplateMessage({
        to: phoneValidation.formattedNumber,
        templateName: templateName,
        variables: variables,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: "warranty_expired",
          customerName: customer.full_name,
          messageType: "warranty_expired",
        },
      });

      if (result.success) {
        this.logInfo(`Warranty expired reminder sent successfully`, {
          customer: customer.full_name,
          product: invoiceItem.product_name,
        });
      } else {
        this.logError("sendWarrantyExpiredReminder", new Error(result.error), {
          customer: customer.full_name,
          itemId: invoiceItem.invoice_item_id,
        });
      }
    } catch (error) {
      this.logError("sendWarrantyExpiredReminder", error, {
        itemId: invoiceItem.invoice_item_id,
      });
    }
  }

  /**
   * Get template variables for warranty reminders
   * @param {Object} invoiceItem - Invoice item object
   * @param {number} daysUntilExpiry - Days until expiry (only for expiring reminders)
   * @param {Object} cachedShop - Preloaded shop object
   * @returns {Object} - Template variables
   */
  async getWarrantyTemplateVariables(invoiceItem, daysUntilExpiry = null, cachedShop = null) {
    const customer = invoiceItem.invoice_id.customer_id;
    const shop =
      cachedShop ||
      (invoiceItem.invoice_id.shop_id ? await Shop.findById(invoiceItem.invoice_id.shop_id) : null);
    const shopName = getShopName(shop);
    const contactInfo =
      getShopContactInfo(shop) ||
      process.env.SHOP_CONTACT ||
      "Contact us";

    if (daysUntilExpiry !== null) {
      // For warranty_expiring template: customer_name, product_name, days_remaining, contact_info, shop_name
      return {
        1: customer.full_name || "Customer",
        2: invoiceItem.product_name || "Product",
        3: daysUntilExpiry.toString(),
        4: contactInfo,
        5: shopName,
      };
    } else {
      // For warranty_expired template: customer_name, product_name, contact_info, shop_name
      return {
        1: customer.full_name || "Customer",
        2: invoiceItem.product_name || "Product",
        3: contactInfo,
        4: shopName,
      };
    }
  }
}
