import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import InvoiceItem from "../../models/InvoiceItem.js";
import { createDateRange } from "../core/utils.js";

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

        for (const item of expiringWarranties) {
          await this.sendWarrantyExpiryReminder(item, days);
        }
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

      for (const item of expiredWarranties) {
        await this.sendWarrantyExpiredReminder(item);
      }
    } catch (error) {
      this.logError("processExpiredWarranties", error);
    }
  }

  /**
   * Send warranty expiry reminder
   * @param {Object} invoiceItem - Invoice item object
   * @param {number} daysUntilExpiry - Days until warranty expires
   */
  async sendWarrantyExpiryReminder(invoiceItem, daysUntilExpiry) {
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
      const templateName = "warranty_expiry_v1";

      // Check if reminder already sent
      const alreadySent = await this.isReminderAlreadySent(
        invoiceItem.invoice_item_id,
        "PRODUCT",
        templateName,
      );

      if (alreadySent) {
        this.logInfo(
          `Warranty expiry reminder already sent for item ${invoiceItem.invoice_item_id}`,
        );
        return;
      }

      // Validate phone number
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

      // Prepare template variables for warranty_expiry_v1
      // Based on MSG91_WHATSAPP_TEMPLATES.md: customer_name, product_name, serial_number, shop_name
      const variables = await this.getWarrantyTemplateVariables(invoiceItem);

      // Create reminder log
      const reminderLog = await this.createReminderLog({
        entityId: invoiceItem.invoice_item_id,
        entityType: "PRODUCT",
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
   */
  async sendWarrantyExpiredReminder(invoiceItem) {
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
      const templateName = "warranty_expired_v1";

      // Check if reminder already sent
      const alreadySent = await this.isReminderAlreadySent(
        invoiceItem.invoice_item_id,
        "PRODUCT",
        templateName,
      );

      if (alreadySent) {
        this.logInfo(
          `Warranty expired reminder already sent for item ${invoiceItem.invoice_item_id}`,
        );
        return;
      }

      // Validate phone number
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

      // Prepare template variables for warranty_expired_v1
      // Based on MSG91_WHATSAPP_TEMPLATES.md: customer_name, product_name, serial_number, shop_name
      const variables = await this.getWarrantyTemplateVariables(invoiceItem);

      // Create reminder log
      const reminderLog = await this.createReminderLog({
        entityId: invoiceItem.invoice_item_id,
        entityType: "PRODUCT",
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
   * @returns {Object} - Template variables
   */
  async getWarrantyTemplateVariables(invoiceItem) {
    const customer = invoiceItem.invoice_id.customer_id;

    // Variables: customer_name, product_name, serial_number, shop_name
    return {
      1: customer.full_name || "Customer",
      2: invoiceItem.product_name || "Product",
      3: invoiceItem.serial_number || "N/A",
      4: process.env.SHOP_NAME || "Our Shop",
    };
  }
}
