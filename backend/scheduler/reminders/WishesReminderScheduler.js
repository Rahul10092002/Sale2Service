import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import Customer from "../../models/Customer.js";
import { createDateRange } from "../core/utils.js";

/**
 * Wishes-specific reminder scheduler
 * Handles birthday and anniversary wishes to customers
 */
export default class WishesReminderScheduler extends BaseScheduler {
  constructor() {
    super();
    this.messageSender = new MessageSender();
  }

  /**
   * Process all wishes reminders
   */
  async processWishesReminders() {
    try {
      this.logInfo("Processing wishes reminders...");

      await Promise.all([
        this.processBirthdayWishes(),
        this.processAnniversaryWishes(),
      ]);

      this.logInfo("Wishes reminders processing completed");
    } catch (error) {
      this.logError("processWishesReminders", error);
    }
  }

  /**
   * Process birthday wishes (send on birthday)
   */
  async processBirthdayWishes() {
    try {
      const today = new Date();
      const todayMonth = today.getMonth() + 1; // 1-based month
      const todayDate = today.getDate();

      // Find customers whose birthday is today
      const birthdayCustomers = await Customer.find({
        date_of_birth: {
          $exists: true,
          $ne: null,
        },
        deleted_at: null,
      });

      // Filter by month and date (ignoring year)
      const todayBirthdays = birthdayCustomers.filter((customer) => {
        const dob = new Date(customer.date_of_birth);
        return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDate;
      });

      this.logInfo(
        `Found ${todayBirthdays.length} customers with birthdays today`,
      );

      for (const customer of todayBirthdays) {
        await this.sendBirthdayWish(customer);
      }
    } catch (error) {
      this.logError("processBirthdayWishes", error);
    }
  }

  /**
   * Process anniversary wishes (send on anniversary)
   */
  async processAnniversaryWishes() {
    try {
      const today = new Date();
      const todayMonth = today.getMonth() + 1; // 1-based month
      const todayDate = today.getDate();

      // Find customers whose anniversary is today
      const anniversaryCustomers = await Customer.find({
        anniversary_date: {
          $exists: true,
          $ne: null,
        },
        deleted_at: null,
      });

      // Filter by month and date (ignoring year)
      const todayAnniversaries = anniversaryCustomers.filter((customer) => {
        const anniversaryDate = new Date(customer.anniversary_date);
        return (
          anniversaryDate.getMonth() + 1 === todayMonth &&
          anniversaryDate.getDate() === todayDate
        );
      });

      this.logInfo(
        `Found ${todayAnniversaries.length} customers with anniversaries today`,
      );

      for (const customer of todayAnniversaries) {
        await this.sendAnniversaryWish(customer);
      }
    } catch (error) {
      this.logError("processAnniversaryWishes", error);
    }
  }

  /**
   * Send birthday wish to customer
   * @param {Object} customer - Customer object
   */
  async sendBirthdayWish(customer) {
    try {
      const templateName = "birthday_wish";

      // Check if wish already sent today (24-hour window)
      const alreadySent = await this.isReminderAlreadySent(
        customer.customer_id,
        "CUSTOMER",
        templateName,
        24, // Only check last 24 hours for wishes
      );

      if (alreadySent) {
        this.logInfo(
          `Birthday wish already sent to customer ${customer.full_name}`,
        );
        return;
      }

      // Validate phone number
      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError("sendBirthdayWish", new Error(phoneValidation.error), {
          customer: customer.full_name,
          customerId: customer.customer_id,
        });
        return;
      }

      // Prepare template variables for birthday_wish
      // {{1}}: Customer name, {{2}}: Shop name
      const variables = {
        1: customer.full_name,
        2: process.env.SHOP_NAME || "Our Shop",
      };

      // Build message content for logging
      const messageContent = `नमस्ते ${variables[1]},\n\nआपको जन्मदिन की हार्दिक शुभकामनाएँ 🎉\n\nईश्वर आपको स्वस्थ, सुखी और सफल जीवन प्रदान करें।\nआपका दिन खुशियों और सफलता से भरा रहे।\n\nसादर,\n${variables[2]} की ओर से`;

      // Create reminder log
      const reminderLog = await this.createReminderLog({
        entityId: customer.customer_id,
        entityType: "CUSTOMER",
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent: messageContent,
        templateName: templateName,
      });

      // Send WhatsApp message
      const result = await this.messageSender.sendTemplateMessage({
        to: phoneValidation.formattedNumber,
        templateName: templateName,
        variables: variables,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: "birthday_wish",
          customerName: customer.full_name,
          messageType: "birthday_wish",
        },
      });

      if (result.success) {
        this.logInfo(`Birthday wish sent successfully`, {
          customer: customer.full_name,
          date: new Date(customer.date_of_birth).toLocaleDateString(),
        });
      } else {
        this.logError("sendBirthdayWish", new Error(result.error), {
          customer: customer.full_name,
          customerId: customer.customer_id,
        });
      }
    } catch (error) {
      this.logError("sendBirthdayWish", error, {
        customerId: customer.customer_id,
      });
    }
  }

  /**
   * Send anniversary wish to customer
   * @param {Object} customer - Customer object
   */
  async sendAnniversaryWish(customer) {
    try {
      const templateName = "anniversary_wish";

      // Check if wish already sent today (24-hour window)
      const alreadySent = await this.isReminderAlreadySent(
        customer.customer_id,
        "CUSTOMER",
        templateName,
        24, // Only check last 24 hours for wishes
      );

      if (alreadySent) {
        this.logInfo(
          `Anniversary wish already sent to customer ${customer.full_name}`,
        );
        return;
      }

      // Validate phone number
      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError("sendAnniversaryWish", new Error(phoneValidation.error), {
          customer: customer.full_name,
          customerId: customer.customer_id,
        });
        return;
      }

      // Prepare template variables for anniversary_wish
      // {{1}}: Customer name, {{2}}: Shop name
      const variables = {
        1: customer.full_name,
        2: process.env.SHOP_NAME || "Our Shop",
      };

      // Build message content for logging
      const messageContent = `नमस्ते ${variables[1]} जी,\n\nआपको विवाह वर्षगाँठ की हार्दिक शुभकामनाएँ 💐\n\nईश्वर से प्रार्थना है कि आपका जीवन प्रेम, विश्वास और खुशियों से सदा भरा रहे।\nआप दोनों का साथ यूँ ही बना रहे।\n\nसादर,\n${variables[2]} की ओर से।`;

      // Create reminder log
      const reminderLog = await this.createReminderLog({
        entityId: customer.customer_id,
        entityType: "CUSTOMER",
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent: messageContent,
        templateName: templateName,
      });

      // Send WhatsApp message
      const result = await this.messageSender.sendTemplateMessage({
        to: phoneValidation.formattedNumber,
        templateName: templateName,
        variables: variables,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: "anniversary_wish",
          customerName: customer.full_name,
          messageType: "anniversary_wish",
        },
      });

      if (result.success) {
        this.logInfo(`Anniversary wish sent successfully`, {
          customer: customer.full_name,
          date: new Date(customer.anniversary_date).toLocaleDateString(),
        });
      } else {
        this.logError("sendAnniversaryWish", new Error(result.error), {
          customer: customer.full_name,
          customerId: customer.customer_id,
        });
      }
    } catch (error) {
      this.logError("sendAnniversaryWish", error, {
        customerId: customer.customer_id,
      });
    }
  }
}
