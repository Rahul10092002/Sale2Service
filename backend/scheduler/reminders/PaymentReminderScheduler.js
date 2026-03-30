import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import Invoice from "../../models/Invoice.js";
import { createDateRange, formatDateForMessage } from "../core/utils.js";

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
   * Process all payment reminders
   */
  async processPaymentReminders() {
    try {
      this.logInfo("Processing payment reminders...");

      await this.processPendingPayments();

      this.logInfo("Payment reminders processing completed");
    } catch (error) {
      this.logError("processPaymentReminders", error);
    }
  }

  /**
   * Process pending payment reminders (3, 7, 15 days after invoice date)
   */
  async processPendingPayments() {
    try {
      const reminderDays = [3, 7, 15]; // Days after invoice date

      for (const days of reminderDays) {
        // Create date range for invoices created X days ago
        const invoiceDateRange = createDateRange(-days);

        const pendingInvoices = await Invoice.find({
          invoice_date: {
            $gte: invoiceDateRange.start,
            $lt: invoiceDateRange.end,
          },
          payment_status: { $in: ["UNPAID", "PARTIAL"] },
          deleted_at: null,
        }).populate("customer_id");

        this.logInfo(
          `Found ${pendingInvoices.length} pending invoices from ${days} days ago`,
        );

        for (const invoice of pendingInvoices) {
          await this.sendPaymentReminder(invoice, days);
        }
      }
    } catch (error) {
      this.logError("processPendingPayments", error);
    }
  }

  /**
   * Send payment reminder
   * @param {Object} invoice - Invoice object
   * @param {number} daysAfterInvoice - Days after invoice date
   */
  async sendPaymentReminder(invoice, daysAfterInvoice) {
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
      const templateName = this.getPaymentTemplateByDays(daysAfterInvoice);

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
      const variables = this.getPaymentTemplateVariables(invoice);

      // Create reminder log
      const reminderLog = await this.createReminderLog({
        entityId: invoice.invoice_id,
        entityType: "INVOICE",
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent: `Payment reminder for invoice ${invoice.invoice_number} (${daysAfterInvoice} days overdue)`,
        templateName: templateName,
      });

      // Send WhatsApp message
      const result = await this.messageSender.sendTemplateMessage({
        to: phoneValidation.formattedNumber,
        templateName: templateName,
        variables: variables,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: "payment_reminders",
          customerName: customer.full_name,
          messageType: "payment_reminders",
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
   * @returns {Object} - Template variables
   */
  getPaymentTemplateVariables(invoice) {
    // Template payment_reminders has 4 params:
    // {{1}}: Amount, {{2}}: Invoice number, {{3}}: Due date, {{4}}: Shop name
    return {
      1:
        typeof invoice.total_amount === "number"
          ? invoice.total_amount.toFixed(2)
          : String(invoice.total_amount || "0"),
      2: invoice.invoice_number || "N/A",
      3: formatDateForMessage(invoice.due_date),
      4: process.env.SHOP_NAME || "Our Shop",
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
