import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import Shop from "../../models/Shop.js";
import { PaymentReminderService } from "../../services/paymentReminderService.js";
import {
  formatPhoneNumber,
  getShopName,
} from "../core/utils.js";

/**
 * Customer Ledger-based Payment Reminder Scheduler
 * Replaces old invoice-wise reminders with customer-level consolidated WhatsApp reminders.
 * Runs daily at 9:00 AM IST.
 */
export default class PaymentReminderScheduler extends BaseScheduler {
  constructor() {
    super();
    this.messageSender = new MessageSender();
  }

  /**
   * Main scheduler trigger
   * Evaluates all shops and eligible customers, dispatches consolidated reminders,
   * and sends daily payment summaries to shop owners.
   */
  async processPaymentReminders(targetDate = new Date()) {
    try {
      this.logInfo("Processing customer-level consolidated payment reminders...");

      // Execute consolidated processing across all shops & customers
      const results = await PaymentReminderService.processAllPaymentReminders(targetDate);

      this.logInfo("Consolidated payment reminders run summary:", {
        shopsProcessed: results.shopsProcessed,
        remindersSent: results.remindersSent,
        remindersSkipped: results.remindersSkipped,
        remindersFailed: results.remindersFailed,
      });

      // Send daily payment summary to each shop owner that had reminders sent
      if (results.shopSummaries && Object.keys(results.shopSummaries).length > 0) {
        for (const [shopId, entries] of Object.entries(results.shopSummaries)) {
          await this.sendPaymentDailySummary(shopId, entries);
        }
      }

      this.logInfo("Customer payment reminders processing completed successfully");
      return results;
    } catch (error) {
      this.logError("processPaymentReminders", error);
      throw error;
    }
  }

  /**
   * Send a consolidated payment-due summary to the shop owner in Hindi.
   * Template: "daily_payment_summary" (MSG91)
   *
   * Variables layout:
   *   1 → Shop name (Hindi or fallback English)
   *   2 → Today's date (formatted in Hindi)
   *   3 → Total reminders sent count
   *   4 → Total pending amount (₹)
   *   5 → Customer-wise list
   */
  async sendPaymentDailySummary(shopId, entries) {
    try {
      if (!entries || entries.length === 0) return;

      const shop = await Shop.findById(shopId);
      if (!shop || shop.deleted_at) return;

      if (!shop.phone) {
        this.logError(
          "sendPaymentDailySummary",
          new Error("Missing shop phone number"),
          { shopId }
        );
        return;
      }

      const shopName = getShopName(shop);

      // Date in Hindi locale
      const today = new Date();
      const formattedDate = today.toLocaleDateString("hi-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // Total pending amount
      const totalAmount = entries.reduce(
        (sum, e) => sum + (parseFloat(e.amountDue) || 0),
        0
      );

      // Customer-wise summary list
      const customerList = entries
        .map((e) => {
          const phoneStr = e.customerPhone ? ` (${e.customerPhone})` : "";
          const invStr = e.invoiceCount ? ` [${e.invoiceCount} बिल]` : "";
          return `• ${e.customerName}${phoneStr}${invStr} — ₹${parseFloat(
            e.amountDue || 0
          ).toLocaleString("en-IN")} (${e.statusLabel})`;
        })
        .join("\n");

      // MSG91 template variables
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
          { shopId }
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
          shopId: shop._id,
        },
      });

      this.logInfo(
        `Payment daily summary sent to shop ${shopName} (${entries.length} reminders, ₹${totalAmount.toFixed(2)})`
      );
    } catch (error) {
      this.logError("sendPaymentDailySummary", error, { shopId });
    }
  }
}
