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
  getFirstName,
  processInConcurrentBatches,
} from "../core/utils.js";

/**
 * Wishes-specific reminder scheduler
 * Handles birthday, anniversary, and festival bulk wishes to customers at scale (up to 50k+ customers)
 */
export default class WishesReminderScheduler extends BaseScheduler {
  constructor() {
    super();
    this.messageSender = new MessageSender();
    this.dailySummaryMap = {};
    this.BATCH_SIZE = 100; // Batch size per worker chunk
    this.CONCURRENCY_LIMIT = 15; // Parallel workers for MSG91 HTTP requests
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

    const shops = await Shop.find({ _id: { $in: shopIds } }).lean();
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
      this.dailySummaryMap = {};

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
   * Process birthday wishes (send on birthday in IST)
   */
  async processBirthdayWishes() {
    try {
      const today = getISTTodayParts();

      // MongoDB server-side aggregation for birthdays in IST timezone (+05:30)
      const birthdayCustomers = await Customer.aggregate([
        {
          $match: {
            date_of_birth: { $ne: null },
            deleted_at: null,
          },
        },
        {
          $addFields: {
            dobParts: {
              $dateToParts: { date: "$date_of_birth", timezone: "+05:30" },
            },
          },
        },
        {
          $match: {
            "dobParts.month": today.month,
            "dobParts.day": today.date,
          },
        },
      ]);

      this.logInfo(
        `Found ${birthdayCustomers.length} customers with birthdays today`,
      );

      if (birthdayCustomers.length === 0) return;

      const shopMap = await this.getShopMapForCustomers(birthdayCustomers);

      // Bulk fetch sent log keys to eliminate N+1 DB checks
      const customerIds = birthdayCustomers.map((c) => c.customer_id);
      const sentSet = await this.getSentReminderLogsBatch(
        customerIds,
        "birthday_wish",
        24,
      );

      await processInConcurrentBatches({
        items: birthdayCustomers,
        batchSize: this.BATCH_SIZE,
        concurrencyLimit: this.CONCURRENCY_LIMIT,
        processorFn: async (customer) => {
          const sentKey = `${customer.customer_id}:birthday_wish`;
          if (sentSet.has(sentKey)) {
            this.logInfo(
              `Birthday wish already sent to customer ${customer.full_name}`,
            );
            return { success: true, skipped: true };
          }

          return await this.sendBirthdayWish(
            customer,
            shopMap[String(customer.shop_id)],
            { skipAlreadySentCheck: true },
          );
        },
      });
    } catch (error) {
      this.logError("processBirthdayWishes", error);
    }
  }

  /**
   * Process anniversary wishes (send on anniversary in IST)
   */
  async processAnniversaryWishes() {
    try {
      const today = getISTTodayParts();

      // MongoDB server-side aggregation for anniversaries in IST timezone (+05:30)
      const anniversaryCustomers = await Customer.aggregate([
        {
          $match: {
            anniversary_date: { $ne: null },
            deleted_at: null,
          },
        },
        {
          $addFields: {
            annivParts: {
              $dateToParts: { date: "$anniversary_date", timezone: "+05:30" },
            },
          },
        },
        {
          $match: {
            "annivParts.month": today.month,
            "annivParts.day": today.date,
          },
        },
      ]);

      this.logInfo(
        `Found ${anniversaryCustomers.length} customers with anniversaries today`,
      );

      if (anniversaryCustomers.length === 0) return;

      const shopMap = await this.getShopMapForCustomers(anniversaryCustomers);

      // Bulk fetch sent log keys to eliminate N+1 DB checks
      const customerIds = anniversaryCustomers.map((c) => c.customer_id);
      const sentSet = await this.getSentReminderLogsBatch(
        customerIds,
        "anniversary_wish",
        24,
      );

      await processInConcurrentBatches({
        items: anniversaryCustomers,
        batchSize: this.BATCH_SIZE,
        concurrencyLimit: this.CONCURRENCY_LIMIT,
        processorFn: async (customer) => {
          const sentKey = `${customer.customer_id}:anniversary_wish`;
          if (sentSet.has(sentKey)) {
            this.logInfo(
              `Anniversary wish already sent to customer ${customer.full_name}`,
            );
            return { success: true, skipped: true };
          }

          return await this.sendAnniversaryWish(
            customer,
            shopMap[String(customer.shop_id)],
            { skipAlreadySentCheck: true },
          );
        },
      });
    } catch (error) {
      this.logError("processAnniversaryWishes", error);
    }
  }

  /**
   * Send birthday wish to customer
   * @param {Object} customer - Customer object
   * @param {Object} [cachedShop] - Pre-fetched shop object
   * @param {Object} [options] - Options
   */
  async sendBirthdayWish(customer, cachedShop = null, options = {}) {
    try {
      const templateName = "birthday_wish";

      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError("sendBirthdayWish", new Error(phoneValidation.error), {
          customer: customer.full_name,
          customerId: customer.customer_id,
        });
        return { success: false, error: phoneValidation.error };
      }

      if (!options.skipAlreadySentCheck) {
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
            `Birthday wish already sent to customer ${customer.full_name}`,
          );
          return { success: true, skipped: true };
        }
      }

      const shop =
        cachedShop ||
        (customer.shop_id ? await Shop.findById(customer.shop_id).lean() : null);

      const variables = {
        1: getFirstName(customer?.full_name),
        2: getShopName(shop),
      };

      const messageContent = `नमस्ते ${variables[1]},\n\nआपको जन्मदिन की हार्दिक शुभकामनाएँ 🎉\n\nईश्वर आपको स्वस्थ, सुखी और सफल जीवन प्रदान करें।\nआपका दिन खुशियों और सफलता से भरा रहे।\n\nसादर,\n${variables[2]} की ओर से`;

      const reminderLog = await this.createReminderLog({
        entityId: customer.customer_id,
        entityType: "CUSTOMER",
        shopId: customer.shop_id,
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent: messageContent,
        templateName: templateName,
      });

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
        this.addToSummary(customer, "birthday");
        return { success: true };
      } else {
        this.logError("sendBirthdayWish", new Error(result.error), {
          customer: customer.full_name,
          customerId: customer.customer_id,
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logError("sendBirthdayWish", error, {
        customerId: customer.customer_id,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send anniversary wish to customer
   * @param {Object} customer - Customer object
   * @param {Object} [cachedShop] - Preloaded shop object
   * @param {Object} [options] - Options
   */
  async sendAnniversaryWish(customer, cachedShop = null, options = {}) {
    try {
      const templateName = "anniversary_wish";

      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError("sendAnniversaryWish", new Error(phoneValidation.error), {
          customer: customer.full_name,
          customerId: customer.customer_id,
        });
        return { success: false, error: phoneValidation.error };
      }

      if (!options.skipAlreadySentCheck) {
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
          return { success: true, skipped: true };
        }
      }

      const shop =
        cachedShop ||
        (customer.shop_id ? await Shop.findById(customer.shop_id).lean() : null);

      const variables = {
        1: getFirstName(customer?.full_name),
        2: getShopName(shop),
      };

      const messageContent = `नमस्ते ${variables[1]} जी,\n\nआपको विवाह वर्षगाँठ की हार्दिक शुभकामनाएँ 💐\n\nईश्वर से प्रार्थना है कि आपका जीवन प्रेम, विश्वास और खुशियों से सदा भरा रहे।\nआप दोनों का साथ यूँ ही बना रहे।\n\nसादर,\n${variables[2]} की ओर से।`;

      const reminderLog = await this.createReminderLog({
        entityId: customer.customer_id,
        entityType: "CUSTOMER",
        shopId: customer.shop_id,
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent: messageContent,
        templateName: templateName,
      });

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
        this.addToSummary(customer, "anniversary");
        return { success: true };
      } else {
        this.logError("sendAnniversaryWish", new Error(result.error), {
          customer: customer.full_name,
          customerId: customer.customer_id,
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logError("sendAnniversaryWish", error, {
        customerId: customer.customer_id,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Process pending festival wishes
   */
  async processFestivalWishes() {
    try {
      this.logInfo("Processing festival wishes...");

      const today = getISTTodayParts();
      const festivals = await FestivalSchedule.find({
        status: { $in: ["Pending", "Processing"] },
      }).lean();

      const todayFestivals = festivals.filter((festival) => {
        const { date, month, year } = getISTDateParts(festival.schedule_date);
        return date === today.date && month === today.month && year === today.year;
      });

      this.logInfo(`Found ${todayFestivals.length} festival schedules for today`);

      for (const festival of todayFestivals) {
        await this.processFestivalForShop(festival);
      }
    } catch (error) {
      this.logError("processFestivalWishes", error);
    }
  }

  /**
   * Process festival wishes for a shop with high-performance batch streaming (up to 5k+ customers)
   * @param {Object} festival - FestivalSchedule object
   */
  async processFestivalForShop(festival) {
    try {
      this.logInfo(
        `Starting festival wish campaign "${festival.festival_name}" for shop ${festival.shop_id}`,
      );

      // Pre-fetch shop details once
      const shop = await Shop.findById(festival.shop_id).lean();

      // Query customers in lightweight lean mode
      const customers = await Customer.find({
        shop_id: festival.shop_id,
        deleted_at: null,
      })
        .select("_id customer_id full_name whatsapp_number shop_id")
        .lean();

      const totalCustomers = customers.length;
      if (totalCustomers === 0) {
        this.logInfo(`No customers found for shop ${festival.shop_id}`);
        await FestivalSchedule.findByIdAndUpdate(festival._id, {
          festival_wishes_sent: 0,
          status: "Completed",
        });
        return;
      }

      // Mark status as Processing
      await FestivalSchedule.findByIdAndUpdate(festival._id, {
        status: "Processing",
      });

      const templateName = "festival_wish";
      const customTemplateKey = `${templateName}_${festival._id}`;
      let totalSentCount = festival.festival_wishes_sent || 0;

      // Process in concurrent batches (100 customers per batch, 15 concurrent workers)
      await processInConcurrentBatches({
        items: customers,
        batchSize: this.BATCH_SIZE,
        concurrencyLimit: this.CONCURRENCY_LIMIT,
        batchDelayMs: 50,
        processorFn: async (customerChunk, chunkStartIndex) => {
          // Chunk is processed inside worker pool
          return await this.sendFestivalWish(customerChunk, shop, festival, {
            templateKey: customTemplateKey,
          });
        },
        onBatchComplete: async ({ processedCount, batchSuccessCount }) => {
          totalSentCount += batchSuccessCount;
          // Progress update on FestivalSchedule
          await FestivalSchedule.findByIdAndUpdate(festival._id, {
            festival_wishes_sent: totalSentCount,
          });
          this.logInfo(
            `Festival "${festival.festival_name}" Progress: ${processedCount}/${totalCustomers} processed (${totalSentCount} sent)`,
          );
        },
      });

      // Mark completed
      await FestivalSchedule.findByIdAndUpdate(festival._id, {
        festival_wishes_sent: totalSentCount,
        status: "Completed",
      });

      this.logInfo(
        `Festival "${festival.festival_name}" completed: ${totalSentCount}/${totalCustomers} wishes sent`,
      );
    } catch (error) {
      this.logError("processFestivalForShop", error, {
        festivalId: festival._id,
      });
    }
  }

  /**
   * Send single festival wish to customer
   * @param {Object} customer - Customer object
   * @param {Object} cachedShop - Preloaded shop object
   * @param {Object} festival - Festival object
   * @param {Object} [options] - Options
   */
  async sendFestivalWish(customer, cachedShop = null, festival, options = {}) {
    try {
      const templateName = "festival_wish";
      const customTemplateKey = options.templateKey || `${templateName}_${festival._id}`;

      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError("sendFestivalWish", new Error(phoneValidation.error), {
          customer: customer.full_name,
        });
        return { success: false, error: phoneValidation.error };
      }

      if (!options.skipAlreadySentCheck) {
        const alreadySent = await this.isReminderAlreadySent(
          customer.customer_id,
          "CUSTOMER",
          customTemplateKey,
          24,
          festival.shop_id,
          phoneValidation.formattedNumber,
        );

        if (alreadySent) {
          return { success: true, skipped: true };
        }
      }

      const shop =
        cachedShop ||
        (customer.shop_id ? await Shop.findById(customer.shop_id).lean() : null);

      const variables = {
        1: getFirstName(customer?.full_name),
        2: festival.festival_name,
        3: getShopName(shop),
      };

      const messageContent = `नमस्ते ${variables[1]} जी 😊\n\n✨ आपको और आपके परिवार को ${variables[2]} की हार्दिक शुभकामनाएं! ✨\n\nईश्वर से प्रार्थना है कि यह पावन अवसर आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n${variables[3]} की ओर से`;

      const reminderLog = await this.createReminderLog({
        entityId: customer.customer_id,
        entityType: "CUSTOMER",
        shopId: festival.shop_id,
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent,
        templateName: customTemplateKey,
      });

      const result = await this.messageSender.sendTemplateMessage({
        to: phoneValidation.formattedNumber,
        templateName: templateName,
        variables,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: "festival_wish",
          customerName: customer.full_name,
          festivalName: festival.festival_name,
          messageType: "festival_wish",
        },
      });

      if (result.success) {
        return { success: true };
      } else {
        this.logError("sendFestivalWish", new Error(result.error), {
          customerId: customer.customer_id,
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logError("sendFestivalWish", error, {
        customerId: customer.customer_id,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send daily summary of birthdays/anniversaries to shop owner
   */
  async sendDailySummary(shopId, todayBirthdays, todayAnniversaries) {
    try {
      const shop = await Shop.findById(shopId).lean();
      if (!shop || !shop.phone) {
        this.logError(
          "sendDailySummary",
          new Error("Missing shop or phone number"),
          { shopId },
        );
        return;
      }
      const shopName = getShopName(shop);

      const today = new Date();
      const formattedDate = today.toLocaleDateString("hi-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const birthdayCount = todayBirthdays.length;
      const anniversaryCount = todayAnniversaries.length;
      const total = birthdayCount + anniversaryCount;

      if (total === 0) return;

      const allCustomers = [
        ...todayBirthdays.map((c) => ({
          name: getFirstName(c.full_name),
          whatsapp_number: c.whatsapp_number,
          type: "जन्मदिन",
        })),
        ...todayAnniversaries.map((c) => ({
          name: getFirstName(c.full_name),
          whatsapp_number: c.whatsapp_number,
          type: "वर्षगाँठ",
        })),
      ];

      const limitedCustomers = allCustomers.slice(0, 5);

      let customerList = limitedCustomers
        .map((c) => `• ${c.name}(${c.whatsapp_number}) – ${c.type}`)
        .join(" | ");

      if (allCustomers.length > 5) {
        customerList += `\n+${allCustomers.length - 5} अन्य ग्राहक`;
      }

      const variables = {
        1: formattedDate,
        2: shopName,
        3: String(total),
        4: String(birthdayCount),
        5: String(anniversaryCount),
        6: customerList || "-",
      };

      const to = formatPhoneNumber(shop.phone);
      if (!to) return null;

      await this.messageSender.sendTemplateMessage({
        to: to,
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
