import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import Invoice from "../../models/Invoice.js";
import InvoiceItem from "../../models/InvoiceItem.js";
import { createDateRange, formatDateForMessage, formatPhoneNumber } from "../core/utils.js";
import Shop from "../../models/Shop.js";
import { getShopName, getShopContactInfo } from "../core/utils.js";
/**
 * Payment-specific reminder scheduler
 * Handles pending payment reminders at different intervals
 */
export default class PaymentReminderScheduler extends BaseScheduler {
  constructor() {
    super();
    this.messageSender = new MessageSender();
    this.dailySummaryMap = {};
  }

  /**
   * Track a successfully-sent reminder so we can summarise later for the shop owner.
   * @param {Object} invoice - Invoice with populated customer_id
   * @param {string} statusLabel - Human label ("due today", "3 days before due", "overdue")
   */
  addToPaymentSummary(invoice, statusLabel) {
    const shopId = String(invoice.shop_id);
    if (!this.dailySummaryMap[shopId]) {
      this.dailySummaryMap[shopId] = [];
    }
    this.dailySummaryMap[shopId].push({
      customerName: invoice.customer_id?.full_name || invoice.customer_name || "ग्राहक",
      invoiceNumber: invoice.invoice_number || "N/A",
      amountDue: invoice.amount_due ?? invoice.total_amount ?? 0,
      dueDate: invoice.due_date,
      statusLabel,
    });
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
      this.dailySummaryMap = {}; // reset for this run

      await Promise.all([
        this.processDueDateReminders(),
        this.processOverdueReminders(),
      ]);

      // After all individual reminders, send daily summary to each shop owner
      await this.sendAllPaymentSummaries();

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

      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError("sendPaymentReminder", new Error(phoneValidation.error), {
          customer: customer.full_name,
          invoiceId: invoice.invoice_id,
        });
        return;
      }

      const alreadySent = await this.isReminderAlreadySent(
        invoice.invoice_id,
        "INVOICE",
        resolvedTemplateName,
        72, // allow re-send after 72 hours (3 days)
        invoice.shop_id,
        phoneValidation.formattedNumber,
      );

      if (alreadySent) {
        this.logInfo(
          `Payment reminder already sent for invoice ${invoice.invoice_number}`,
        );
        return;
      }

      // Prepare template variables for payment reminder
      const { variables, buttons } = await this.getPaymentTemplateVariables(
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
        shopId: invoice.shop_id,
        entityType: "INVOICE",
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent: `Payment reminder for invoice ${invoice.invoice_number} (${statusText})`,
        templateName: resolvedTemplateName,
      });

      // Send WhatsApp message
      const result = await this.messageSender.sendTemplateMessage({
        to: phoneValidation.formattedNumber,
        templateName: resolvedTemplateName,
        variables: variables,
        buttons: buttons,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: resolvedTemplateName,
          customerName: customer.full_name,
          messageType: resolvedTemplateName,
        },
      });

      if (result.success) {
        // Track for daily owner summary
        let statusTextHi;
        if (daysAfterInvoice === 0) {
          statusTextHi = "आज देय";
        } else if (daysAfterInvoice > 0) {
          statusTextHi = `${daysAfterInvoice} दिन बाकी`;
        } else {
          statusTextHi = "अतिदेय";
        }
        this.addToPaymentSummary(invoice, statusTextHi);

        this.logInfo(`Payment reminder sent successfully`, {
          customer: customer.full_name,
          invoiceNumber: invoice.invoice_number,
          daysAfterInvoice,
          amount: invoice.total_amount,
          type: resolvedTemplateName,
          dueDate: invoice.due_date,
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
    const shopContact = getShopContactInfo(shop) || "";

    const customerName =
      invoice.customer_id?.full_name || invoice.customer_name || "";

    if (templateName === "payment_missed") {
      return {
        variables: {
          1: customerName,
          2:
            typeof invoice.amount_due === "number"
              ? invoice.amount_due.toFixed(2)
              : String(invoice.amount_due || "0"),
          3: formatDateForMessage(invoice.due_date),
          4: invoice.invoice_number || "N/A",
          5: serialNumber,
          6: shopContact,
          7: shop?.shop_name_hi || shop?.shop_name || "",
        },
        buttons: [{ subtype: "url", value: shopContact }],
      };
    }

    return {
      variables: {
        1: customerName,
        2:
          typeof invoice.amount_due === "number"
            ? invoice.amount_due.toFixed(2)
            : String(invoice.amount_due || "0"),
        3: invoice.invoice_number || "N/A",
        4: serialNumber,
        5: formatDateForMessage(invoice.due_date),
        6: shopContact,
        7: shop?.shop_name_hi || shop?.shop_name || "",
      },
      buttons: [{ subtype: "quick_reply", value: shopContact }],
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

  // ─── Daily Payment Summary to Shop Owner ──────────────────────────

  /**
   * Send payment summaries to all shops that had reminders today
   */
  async sendAllPaymentSummaries() {
    const shopIds = Object.keys(this.dailySummaryMap);
    if (shopIds.length === 0) {
      this.logInfo("No payment summaries to send");
      return;
    }

    await Promise.all(
      shopIds.map((shopId) =>
        this.sendPaymentDailySummary(
          shopId,
          this.dailySummaryMap[shopId],
        ),
      ),
    );
  }

  /**
   * Send a consolidated payment-due summary to the shop owner in Hindi.
   * Template: "daily_payment_summary" (MSG91)
   *
   * Variables layout:
   *   1 → Shop name (Hindi)
   *   2 → Today's date
   *   3 → Total reminders sent count
   *   4 → Total pending amount (₹)
   *   5 → Customer-wise list (max 10, pipe-separated)
   *
   * Note: Template footer/body includes:
   * "अधिक जानकारी के लिए WarrantyDesk डैशबोर्ड पर चेक करें।"
   */
  async sendPaymentDailySummary(shopId, entries) {
    try {
      if (!entries || entries.length === 0) return;

      const shop = await Shop.findById(shopId);
      if (!shop) return;

      if (!shop.phone) {
        this.logError(
          "sendPaymentDailySummary",
          new Error("Missing shop phone number"),
          { shopId },
        );
        return;
      }

      const shopName = getShopName(shop);

      // 📅 Date in Hindi locale
      const today = new Date();
      const formattedDate = today.toLocaleDateString("hi-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // 💰 Total pending amount
      const totalAmount = entries.reduce(
        (sum, e) => sum + (parseFloat(e.amountDue) || 0),
        0,
      );

      // 📋 Customer list (max 10)
      const limitedEntries = entries.slice(0, 10);
      let customerList = limitedEntries
        .map(
          (e) =>
            `• ${e.customerName} — ₹${parseFloat(e.amountDue || 0).toLocaleString("en-IN")} (${e.statusLabel})`,
        )
        .join(" | ");

      if (entries.length > 10) {
        customerList += ` | +${entries.length - 10} अन्य ग्राहक`;
      }

      // 📦 MSG91 template variables
      const variables = {
        1: shopName,
        2: formattedDate,
        3: String(entries.length),
        4: `₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        5: customerList || "-",
      };

      const to = formatPhoneNumber(shop.phone);
      if (!to) {
        this.logError(
          "sendPaymentDailySummary",
          new Error("Invalid shop phone number"),
          { shopId },
        );
        return;
      }

      await this.messageSender.sendTemplateMessage({
        to,
        templateName: "daily_payment_summary",
        variables,
        metadata: {
          campaignName: "daily_payment_summary",
          type: "summary",
        },
      });

      this.logInfo(
        `Payment daily summary sent to shop ${shopName} (${entries.length} reminders, ₹${totalAmount.toFixed(2)})`,
      );
    } catch (error) {
      this.logError("sendPaymentDailySummary", error);
    }
  }
}
