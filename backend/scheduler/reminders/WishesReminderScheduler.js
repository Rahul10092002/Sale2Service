import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import Customer from "../../models/Customer.js";
import Shop from "../../models/Shop.js";
import {
  getISTTodayParts,
  getISTDateParts,
  getShopName,
} from "../core/utils.js";

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
   * Preload shops for a set of customers to avoid N+1 queries
   * @param {Array} customers
   * @returns {Object} shopMap by shop_id
   */
  async getShopMapForCustomers(customers) {
    const shopIds = [
      ...new Set(
        customers
          .map((customer) => customer.shop_id)
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
      // Use IST date parts to avoid UTC/IST mismatch (server runs UTC)
      const { month: todayMonth, date: todayDate } = getISTTodayParts();

      // Find customers whose birthday is today
      const today = getISTTodayParts();

      const birthdayCustomers = await Customer.aggregate([
        {
          $match: {
            date_of_birth: { $ne: null },
            deleted_at: null,
          },
        },
        {
          $addFields: {
            month: { $month: "$date_of_birth" },
            day: { $dayOfMonth: "$date_of_birth" },
          },
        },
        {
          $match: {
            month: today.month,
            day: today.date,
          },
        },
      ]);

      // Filter by month and date in IST (ignoring year and time)
      const todayBirthdays = birthdayCustomers.filter((customer) => {
        const { month, date } = getISTDateParts(customer.date_of_birth);
        return month === todayMonth && date === todayDate;
      });

      this.logInfo(
        `Found ${todayBirthdays.length} customers with birthdays today`,
      );

      const shopMap = await this.getShopMapForCustomers(todayBirthdays);
      await Promise.all(
        todayBirthdays.map((customer) =>
          this.sendBirthdayWish(customer, shopMap[String(customer.shop_id)]),
        ),
      );
    } catch (error) {
      this.logError("processBirthdayWishes", error);
    }
  }

  /**
   * Process anniversary wishes (send on anniversary)
   */
  async processAnniversaryWishes() {
    try {
      // Use IST date parts to avoid UTC/IST mismatch (server runs UTC)
      const { month: todayMonth, date: todayDate } = getISTTodayParts();

      // Find customers whose anniversary is today
      const anniversaryCustomers = await Customer.find({
        anniversary_date: {
          $exists: true,
          $ne: null,
        },
        deleted_at: null,
      });

      // Filter by month and date in IST (ignoring year and time)
      const todayAnniversaries = anniversaryCustomers.filter((customer) => {
        const { month, date } = getISTDateParts(customer.anniversary_date);
        return month === todayMonth && date === todayDate;
      });

      this.logInfo(
        `Found ${todayAnniversaries.length} customers with anniversaries today`,
      );

      const shopMap = await this.getShopMapForCustomers(todayAnniversaries);
      await Promise.all(
        todayAnniversaries.map((customer) =>
          this.sendAnniversaryWish(customer, shopMap[String(customer.shop_id)]),
        ),
      );
    } catch (error) {
      this.logError("processAnniversaryWishes", error);
    }
  }

  /**
   * Send birthday wish to customer
   * @param {Object} customer - Customer object
   */
  async sendBirthdayWish(customer, cachedShop = null) {
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

      // Fetch shop name from preloaded map or fallback to DB lookup
      const shop =
        cachedShop ||
        (customer.shop_id ? await Shop.findById(customer.shop_id) : null);

      // Prepare template variables for birthday_wish
      // {{1}}: Customer name, {{2}}: Shop name
      const variables = {
        1: customer.full_name,
        2: getShopName(shop),
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
  async sendAnniversaryWish(customer, cachedShop = null) {
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

      // Fetch shop name from preloaded map or fallback to DB lookup
      const shop =
        cachedShop ||
        (customer.shop_id ? await Shop.findById(customer.shop_id) : null);

      // Prepare template variables for anniversary_wish
      // {{1}}: Customer name, {{2}}: Shop name
      const variables = {
        1: customer.full_name,
        2: getShopName(shop),
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
