import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import Invoice from "../../models/Invoice.js";
import InvoiceItem from "../../models/InvoiceItem.js";
import { createDateRange, formatDateForMessage } from "../core/utils.js";
import Shop from "../../models/Shop.js";
import { getShopName } from "../core/utils.js";
/**
 * Payment-specific reminder scheduler
 * Handles pending payment reminders at different intervals
 */
export default class PaymentReminderScheduler extends BaseScheduler {
  constructor() {
    super();
    this.messageSender = new MessageSender();
  }

  /**
   * Preload shops for a set of invoices to avoid N+1 queries
   * @param {Array} invoices
   * @returns {Object} shopMap by shop_id
   */
  async getShopMapForInvoices(invoices) {
    const shopIds = [
      ...new Set(
        invoices
          .map((invoice) => invoice.shop_id)
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
   * Process all payment reminders
   */
  async processPaymentReminders() {
    try {
      this.logInfo("Processing payment reminders...");

      await Promise.all([
        this.processDueDateReminders(),
        this.processOverdueReminders(),
      ]);

      this.logInfo("Payment reminders processing completed");
    } catch (error) {
      this.logError("processPaymentReminders", error);
    }
  }

  /**
   * Process pending payment reminders at 3, 7, 15 days before due date
   */
  async processDueDateReminders() {
    try {
      const reminderDays = [0, 3, 7, 15];

      for (const days of reminderDays) {
        const dueDateRange = createDateRange(days);

        const dateFilter = {
          $gte: dueDateRange.start,
          $lt: dueDateRange.end,
        };

        const pendingInvoices = await Invoice.find({
          due_date: dateFilter,
          payment_status: { $in: ["UNPAID", "PARTIAL"] },
          deleted_at: null,
        }).populate("customer_id");

        this.logInfo(
          `Found ${pendingInvoices.length} invoices due in ${days} days`,
        );

        const shopMap = await this.getShopMapForInvoices(pendingInvoices);
        await Promise.all(
          pendingInvoices.map((invoice) =>
            this.sendPaymentReminder(
              invoice,
              days,
              shopMap[String(invoice.shop_id)],
            ),
          ),
        );
      }
    } catch (error) {
      this.logError("processDueDateReminders", error);
    }
  }

  /**
   * Process overdue payment reminders (past due date)
   */
  async processOverdueReminders() {
    try {
      const todayRange = createDateRange(0);

      const overdueInvoices = await Invoice.find({
        due_date: { $lt: todayRange.start },
        payment_status: { $in: ["UNPAID", "PARTIAL"] },
        deleted_at: null,
      }).populate("customer_id");

      this.logInfo(`Found ${overdueInvoices.length} overdue invoices`);

      // Filter invoices for alternate day logic
      const invoicesToProcess = overdueInvoices.filter((invoice) => {
        const dueDate = new Date(invoice.due_date);
        const today = new Date(todayRange.start);

        const diffTime = today - dueDate;
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // ✅ Alternate day logic
        if (daysOverdue % 2 !== 0) {
          this.logInfo(
            `Skipping invoice ${invoice.invoice_number} (not alternate day)`,
          );
          return false;
        }
        return true;
      });

      const shopMap = await this.getShopMapForInvoices(invoicesToProcess);
      await Promise.all(
        invoicesToProcess.map((invoice) =>
          this.sendPaymentReminder(
            invoice,
            -1, // overdue marker
            shopMap[String(invoice.shop_id)],
            "payment_missed",
          ),
        ),
      );
    } catch (error) {
      this.logError("processOverdueReminders", error);
    }
  }

  /**
   * Send payment reminder
   * @param {Object} invoice - Invoice object
   * @param {number} daysAfterInvoice - Days after invoice date
   * @param {Object} cachedShop - Preloaded shop object
   */
  async sendPaymentReminder(
    invoice,
    daysAfterInvoice,
    cachedShop = null,
    templateName = null,
  ) {
    try {
      // Validate invoice structure
      if (!invoice.customer_id) {
        this.logError(
          "sendPaymentReminder",
          new Error("Customer not found for invoice"),
          {
            invoiceId: invoice.invoice_id,
          },
        );
        return;
      }

      const customer = invoice.customer_id;
      const resolvedTemplateName =
        templateName || this.getPaymentTemplateByDays(daysAfterInvoice);

      // Check if reminder already sent
      const alreadySent = await this.isReminderAlreadySent(
        invoice.invoice_id,
        "INVOICE",
        templateName,
        72, // allow re-send after 72 hours (3 days)
      );

      if (alreadySent) {
        this.logInfo(
          `Payment reminder already sent for invoice ${invoice.invoice_number}`,
        );
        return;
      }

      // Validate phone number
      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError("sendPaymentReminder", new Error(phoneValidation.error), {
          customer: customer.full_name,
          invoiceId: invoice.invoice_id,
        });
        return;
      }

      // Prepare template variables for payment reminder
      const variables = await this.getPaymentTemplateVariables(
        invoice,
        cachedShop,
        resolvedTemplateName,
      );

      let statusText;

      if (daysAfterInvoice === 0) {
        statusText = "due today";
      } else if (daysAfterInvoice > 0) {
        statusText = `${daysAfterInvoice} days before due`;
      } else {
        statusText = "overdue";
      }
      // Create reminder log
      const reminderLog = await this.createReminderLog({
        entityId: invoice.invoice_id,
        entityType: "INVOICE",
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent: `Payment reminder for invoice ${invoice.invoice_number} (${statusText})`,
        templateName: templateName,
      });

      // Send WhatsApp message
      const result = await this.messageSender.sendTemplateMessage({
        to: phoneValidation.formattedNumber,
        templateName: resolvedTemplateName,
        variables: variables,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: resolvedTemplateName,
          customerName: customer.full_name,
          messageType: resolvedTemplateName,
        },
      });

      if (result.success) {
        this.logInfo(`Payment reminder sent successfully`, {
          customer: customer.full_name,
          invoiceNumber: invoice.invoice_number,
          daysAfterInvoice,
          amount: invoice.total_amount,
        });
      } else {
        this.logError("sendPaymentReminder", new Error(result.error), {
          customer: customer.full_name,
          invoiceId: invoice.invoice_id,
        });
      }
    } catch (error) {
      this.logError("sendPaymentReminder", error, {
        invoiceId: invoice.invoice_id,
        daysAfterInvoice,
      });
    }
  }

  /**
   * Get appropriate payment template based on days after invoice
   * @param {number} days - Days after invoice date
   * @returns {string} - Template name
   */
  getPaymentTemplateByDays(days) {
    // Using the same template for all payment reminders
    // Could be customized later for different urgency levels
    return "payment_reminders";
  }

  /**
   * Get template variables for payment reminders
   * @param {Object} invoice - Invoice object
   * @param {Object} cachedShop - Preloaded shop object
   * @returns {Object} - Template variables
   */
  async getPaymentTemplateVariables(
    invoice,
    cachedShop = null,
    templateName = "payment_reminders",
  ) {
    const shop =
      cachedShop ||
      (invoice.shop_id ? await Shop.findById(invoice.shop_id) : null);

    if (!invoice) {
      throw new Error("Invoice is required for payment template variables");
    }

    const invoiceItems = await InvoiceItem.find({
      invoice_id: invoice._id,
      deleted_at: null,
    }).select("serial_number");

    const serialNumber = invoiceItems?.[0]?.serial_number || "N/A";
    const shopContact = shop?.phone ? shop.phone : "";

    if (templateName === "payment_missed") {
      return {
        1:
          typeof invoice.amount_due === "number"
            ? invoice.amount_due.toFixed(2)
            : String(invoice.amount_due || "0"),
        2: formatDateForMessage(invoice.due_date),
        3: invoice.invoice_number || "N/A",
        4: serialNumber,
        5: shopContact,
        6: shop?.shop_name_hi || shop?.shop_name || "",
      };
    }

    return {
      1:
        typeof invoice.amount_due === "number"
          ? invoice.amount_due.toFixed(2)
          : String(invoice.amount_due || "0"),
      2: invoice.invoice_number || "N/A",
      3: serialNumber,
      4: formatDateForMessage(invoice.due_date),
      5: shopContact,
      6: shop?.shop_name_hi || shop?.shop_name || "",
    };
  }

  /**
   * Get overdue amount for an invoice
   * @param {Object} invoice - Invoice object
   * @returns {number} - Overdue amount
   */
  getOverdueAmount(invoice) {
    const totalAmount = parseFloat(invoice.total_amount) || 0;
    const paidAmount = parseFloat(invoice.paid_amount) || 0;
    return Math.max(0, totalAmount - paidAmount);
  }
}
