import cron from "node-cron";
import ServiceReminderScheduler from "./reminders/ServiceReminderScheduler.js";
import WarrantyReminderScheduler from "./reminders/WarrantyReminderScheduler.js";
import PaymentReminderScheduler from "./reminders/PaymentReminderScheduler.js";
import WishesReminderScheduler from "./reminders/WishesReminderScheduler.js";
import MessageSender from "./messaging/MessageSender.js";

/**
 * Main scheduler service that orchestrates all reminder types
 * Uses modular design with separate schedulers for each reminder type
 */
export default class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.serviceScheduler = new ServiceReminderScheduler();
    this.warrantyScheduler = new WarrantyReminderScheduler();
    this.paymentScheduler = new PaymentReminderScheduler();
    this.wishesScheduler = new WishesReminderScheduler();
  }

  /**
   * Start all scheduled jobs
   */
  startScheduler() {
    if (this.isRunning) {
      console.log("[SchedulerService] Scheduler already running");
      return;
    }

    // Check if MSG91 is properly configured
    if (!MessageSender.isConfigured()) {
      console.error(
        "[SchedulerService] MSG91 not properly configured. Please check environment variables:",
      );
      console.error("- MSG91_API_ENDPOINT");
      console.error("- MSG91_AUTHKEY");
      console.error("- MSG91_NUMBER");
      console.error("- MSG91_NAMESPACE");
      return;
    }

    // Run every hour to check for all types of reminders
    cron.schedule("0 * * * *", async () => {
      console.log("[SchedulerService] Running hourly reminder check...");
      await this.processAllReminders();
    });

    // Run daily at 6 AM IST for birthday and anniversary wishes
    cron.schedule("0 6 * * *", async () => {
      console.log(
        "[SchedulerService] Running daily wishes (birthday/anniversary)...",
      );
      await this.wishesScheduler.processWishesReminders();
    });

    // Run daily at 7 AM IST for service schedules
    cron.schedule("0 7 * * *", async () => {
      console.log("[SchedulerService] Running daily service reminders...");
      await this.serviceScheduler.processServiceReminders();
    });

    // Run daily at 8 AM IST for warranty reminders
    cron.schedule("0 8 * * *", async () => {
      console.log("[SchedulerService] Running daily warranty reminders...");
      await this.warrantyScheduler.processWarrantyReminders();
    });

    // Run daily at 9 AM IST for payment reminders
    cron.schedule("0 9 * * *", async () => {
      console.log("[SchedulerService] Running daily payment reminders...");
      await this.paymentScheduler.processPaymentReminders();
    });

    this.isRunning = true;
    console.log("[SchedulerService] Reminder scheduler started successfully");
    console.log("[SchedulerService] Schedule:");
    console.log("  - Hourly: All reminders check");
    console.log("  - 6 AM: Birthday and anniversary wishes");
    console.log("  - 7 AM: Service reminders");
    console.log("  - 8 AM: Warranty reminders");
    console.log("  - 9 AM: Payment reminders");
  }

  /**
   * Stop scheduler
   */
  stopScheduler() {
    this.isRunning = false;
    console.log("[SchedulerService] Reminder scheduler stopped");
  }

  /**
   * Process all types of reminders
   * This is called by the hourly cron job and can be used for manual testing
   */
  async processAllReminders() {
    try {
      console.log("[SchedulerService] Processing all reminder types...");

      // Wishes (birthday/anniversary) are handled by their own daily 6 AM cron — excluded here
      await Promise.all([
        this.serviceScheduler.processServiceReminders(),
        this.warrantyScheduler.processWarrantyReminders(),
        this.paymentScheduler.processPaymentReminders(),
      ]);

      console.log("[SchedulerService] All reminders processed successfully");
    } catch (error) {
      console.error(
        "[SchedulerService] Error processing all reminders:",
        error,
      );
    }
  }

  /**
   * Manual trigger for testing specific reminder types
   * @param {string} type - Type of reminder to test ("wishes", "service", "warranty", "payment", "all")
   * @param {boolean} forceResend - Skip dedup check (for testing)
   */
  async runManualTest(type = "all", forceResend = false) {
    console.log(
      `[SchedulerService] Running manual test for: ${type}${forceResend ? " (force resend enabled)" : ""}`,
    );

    try {
      switch (type.toLowerCase()) {
        case "wishes":
          await this.wishesScheduler.processWishesReminders();
          break;
        case "service":
          await this.serviceScheduler.processServiceReminders(forceResend);
          break;
        case "warranty":
          await this.warrantyScheduler.processWarrantyReminders();
          break;
        case "payment":
          await this.paymentScheduler.processPaymentReminders();
          break;
        case "all":
        default:
          // Wishes excluded from "all" — they have their own scheduled time
          await Promise.all([
            this.serviceScheduler.processServiceReminders(forceResend),
            this.warrantyScheduler.processWarrantyReminders(),
            this.paymentScheduler.processPaymentReminders(),
          ]);
          break;
      }
      console.log(
        `[SchedulerService] Manual test for ${type} completed successfully`,
      );
    } catch (error) {
      console.error(
        `[SchedulerService] Manual test for ${type} failed:`,
        error,
      );
    }
  }

  /**
   * Get scheduler status and configuration
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isConfigured: MessageSender.isConfigured(),
      schedulers: {
        wishes: this.wishesScheduler.constructor.name,
        service: this.serviceScheduler.constructor.name,
        warranty: this.warrantyScheduler.constructor.name,
        payment: this.paymentScheduler.constructor.name,
      },
      environment: {
        msg91Configured: !!process.env.MSG91_API_ENDPOINT,
        shopName: process.env.SHOP_NAME || "Not set",
      },
    };
  }

  /**
   * Test message sending functionality
   * @param {string} phoneNumber - Test phone number
   * @param {string} templateName - Template to test
   * @param {Object} variables - Template variables
   * @returns {Object} - Test result
   */
  async testMessage(
    phoneNumber,
    templateName = "service_reminder",
    variables = {},
  ) {
    try {
      console.log(
        `[SchedulerService] Testing message to ${phoneNumber} with template ${templateName}`,
      );

      const messageSender = new MessageSender();
      const result = await messageSender.sendTemplateMessage({
        to: phoneNumber,
        templateName,
        variables,
        metadata: {
          campaignName: "test_message",
          messageType: "test",
        },
      });

      console.log(`[SchedulerService] Test message result:`, result);
      return result;
    } catch (error) {
      console.error("[SchedulerService] Test message failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
