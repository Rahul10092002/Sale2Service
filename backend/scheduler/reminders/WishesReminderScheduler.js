import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import Customer from "../../models/Customer.js";
import FestivalSchedule from "../../models/FestivalSchedule.js";
import Shop from "../../models/Shop.js";
import {
  getISTTodayParts,
  getISTDateParts,
  getShopName,
  formatPhoneNumber,
} from "../core/utils.js";

/**
 * Wishes-specific reminder scheduler
 * Handles birthday and anniversary wishes to customers
 */
export default class WishesReminderScheduler extends BaseScheduler {
  constructor() {
    super();
    this.messageSender = new MessageSender();
    this.dailySummaryMap = {};
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
  addToSummary(customer, type) {
    const shopId = String(customer.shop_id);

    if (!this.dailySummaryMap[shopId]) {
      this.dailySummaryMap[shopId] = {
        birthdays: [],
        anniversaries: [],
      };
    }

    if (type === "birthday") {
      this.dailySummaryMap[shopId].birthdays.push(customer);
    } else {
      this.dailySummaryMap[shopId].anniversaries.push(customer);
    }
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
        this.processFestivalWishes(),
      ]);

       await Promise.all(
         Object.entries(this.dailySummaryMap).map(([shopId, data]) =>
           this.sendDailySummary(shopId, data.birthdays, data.anniversaries),
         ),
       );

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

      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError("sendBirthdayWish", new Error(phoneValidation.error), {
          customer: customer.full_name,
          customerId: customer.customer_id,
        });
        return;
      }

      const alreadySent = await this.isReminderAlreadySent(
        customer.customer_id,
        "CUSTOMER",
        templateName,
        24, // Only check last 24 hours for wishes
        customer.shop_id,
        phoneValidation.formattedNumber,
      );

      if (alreadySent) {
        this.logInfo(
          `Birthday wish already sent to customer ${customer.full_name}`,
        );
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
        shopId: customer.shop_id,
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
        // this.logInfo(`Birthday wish sent successfully`, {
        //   customer: customer.full_name,
        //   date: new Date(customer.date_of_birth).toLocaleDateString(),
        // });
        this.addToSummary(customer, "birthday");
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

      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError("sendAnniversaryWish", new Error(phoneValidation.error), {
          customer: customer.full_name,
          customerId: customer.customer_id,
        });
        return;
      }

      const alreadySent = await this.isReminderAlreadySent(
        customer.customer_id,
        "CUSTOMER",
        templateName,
        24,
        customer.shop_id,
        phoneValidation.formattedNumber,
      );

      if (alreadySent) {
        this.logInfo(
          `Anniversary wish already sent to customer ${customer.full_name}`,
        );
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
        shopId: customer.shop_id,
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
        // this.logInfo(`Anniversary wish sent successfully`, {
        //   customer: customer.full_name,
        //   date: new Date(customer.anniversary_date).toLocaleDateString(),
        // });
        this.addToSummary(customer, "anniversary");
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
  async processFestivalWishes() {
    try {
      this.logInfo("Processing festival wishes...");

      const today = getISTTodayParts();
      const festivals = await FestivalSchedule.find({
        status: "Pending",
      });
      const todayFestivals = festivals.filter((festival) => {
        const { date, month, year } = getISTDateParts(festival.schedule_date);

        return (
          date === today.date && month === today.month && year === today.year // 🔥 IMPORTANT
        );
      });
      this.logInfo(`Found ${festivals.length} festival schedules for today`);

      await Promise.all(
        todayFestivals.map((festival) => this.processFestivalForShop(festival)),
      );
    } catch (error) {
      this.logError("processFestivalWishes", error);
    }
  }
  async processFestivalForShop(festival) {
    try {
      const customers = await Customer.find({
        shop_id: festival.shop_id,
        deleted_at: null,
      });

      if (!customers.length) {
        this.logInfo(`No customers found for shop ${festival.shop_id}`);

        // Update status as completed with 0 count
        await FestivalSchedule.findByIdAndUpdate(festival._id, {
          festival_wishes_sent: 0,
          status: "Completed",
        });
        return;
      }

      const shop = await Shop.findById(festival.shop_id);
      let successCount = 0;

      await Promise.all(
        customers.map(async (customer) => {
          try {
            await this.sendFestivalWish(customer, shop, festival);
            successCount++;
          } catch (err) {
            this.logError("sendFestivalWish failed", err, {
              customerId: customer._id,
            });
          }
        }),
      );

      await FestivalSchedule.findByIdAndUpdate(festival._id, {
        festival_wishes_sent: successCount,
        status: "Completed",
      });
      this.logInfo(
        `Festival processed: ${successCount}/${customers.length} wishes sent`,
      );
    } catch (error) {
      this.logError("processFestivalForShop", error, {
        festivalId: festival._id,
      });
    }
  }
  async sendFestivalWish(customer, cachedShop = null, festival) {
    try {
      const templateName = "festival_wish";

      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError("sendFestivalWish", new Error(phoneValidation.error), {
          customer: customer.full_name,
        });
        return;
      }

      const alreadySent = await this.isReminderAlreadySent(
        customer.customer_id,
        "CUSTOMER",
        `${templateName}_${festival._id}`, // unique per festival
        24,
        festival.shop_id,
        phoneValidation.formattedNumber,
      );

      if (alreadySent) {
        this.logInfo(
          `Festival wish already sent to ${customer.full_name} for ${festival.festival_name}`,
        );
        return;
      }

      const shop =
        cachedShop ||
        (customer.shop_id ? await Shop.findById(customer.shop_id) : null);

      // Template variables
      // {{1}} Customer Name
      // {{2}} Festival Name
      // {{3}} Shop Name
      const variables = {
        1: festival.festival_name,
        2: getShopName(shop),
      };

      const messageContent = `नमस्ते  😊

आपको ${variables[1]} की हार्दिक शुभकामनाएँ 🎉

ईश्वर से प्रार्थना है कि यह पर्व आपके जीवन में सुख, समृद्धि और खुशियाँ लेकर आए।

सादर,
${variables[2]} की ओर से`;

      // Create log
      const reminderLog = await this.createReminderLog({
        entityId: customer.customer_id,
        entityType: "CUSTOMER",
        shopId: festival.shop_id,
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent,
        templateName: `${templateName}_${festival._id}`, // IMPORTANT
      });

      // Send message
      const result = await this.messageSender.sendTemplateMessage({
        to: phoneValidation.formattedNumber,
        templateName: templateName,
        variables,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: "festival_wish",
          festivalName: festival.festival_name,
          messageType: "festival_wish",
        },
      });

      if (result.success) {
        this.logInfo(
          `Festival wish sent: ${festival.festival_name} → ${customer.full_name}`,
        );
      } else {
        this.logError("sendFestivalWish", new Error(result.error));
      }
    } catch (error) {
      this.logError("sendFestivalWish", error, {
        customerId: customer.customer_id,
      });
    }
  }
  async sendDailySummary(shopId, todayBirthdays, todayAnniversaries) {
    try {
      const shop = await Shop.findById(shopId);
      if (!shop) return;
      if (!shop.phone) {
        this.logError(
          "sendDailySummary",
          new Error("Missing shop phone number"),
          {
            shopId,
          },
        );
        return;
      }
      const shopName = getShopName(shop);

      // 📅 Date
      const today = new Date();
      const formattedDate = today.toLocaleDateString("hi-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // 📊 Counts
      const birthdayCount = todayBirthdays.length;
      const anniversaryCount = todayAnniversaries.length;
      const total = birthdayCount + anniversaryCount;

      // 👥 Customer List (limit 5)
      const allCustomers = [
        ...todayBirthdays.map((c) => ({
          name: c.full_name,
          whatsapp_number: c.whatsapp_number,
          type: "जन्मदिन",
        })),
        ...todayAnniversaries.map((c) => ({
          name: c.full_name,
          whatsapp_number: c.whatsapp_number,
          type: "वर्षगाँठ",
        })),
      ];
      console.log("allCustomers", allCustomers);

      const limitedCustomers = allCustomers.slice(0, 5);

      let customerList = limitedCustomers
        .map((c) => `• ${c.name}(${c.whatsapp_number}) – ${c.type}`)
        .join(" | ");

      if (allCustomers.length > 5) {
        customerList += `\n+${allCustomers.length - 5} अन्य ग्राहक`;
      }

      // 📦 MSG91 Variables
      const variables = {
        1: formattedDate,
        2: shopName,
        3: String(total),
        4: String(birthdayCount),
        5: String(anniversaryCount),
        6: customerList || "-",
      };

      // 📩 Send to shop owner
     

      const to = formatPhoneNumber(shop.phone);

      if (!to) {
        console.error("MSG91 ERROR: Missing 'to' number");
        return null;
      }

      await this.messageSender.sendTemplateMessage({
        to: to, // owner number
        templateName: "daily_wishes_summary",
        variables,
        metadata: {
          campaignName: "daily_summary",
          type: "summary",
        },
      });

      this.logInfo(`Daily summary sent to shop ${shopName}`);
    } catch (error) {
      this.logError("sendDailySummary", error);
    }
  }
}
