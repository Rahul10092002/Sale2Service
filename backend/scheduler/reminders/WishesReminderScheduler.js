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
    this.BATCH_SIZE = 50; // Batch size for birthday/anniversary worker chunks
    this.CONCURRENCY_LIMIT = 5; // Concurrency limit for birthday/anniversary

    // Festival Anti-Spam & Time Window Configurations
    this.FESTIVAL_BATCH_SIZE = 10; // Small batch size (10 customers per chunk) to avoid spam spikes
    this.FESTIVAL_BATCH_COOLDOWN_MS = 3000; // 3 seconds cooldown between 10-customer batches
    this.MIN_DELAY_PER_MSG_MS = 1000; // Never send faster than 1 msg/sec (Meta rate-limit threshold)
    this.MAX_DELAY_PER_MSG_MS = 3500; // Maximum delay per message for small lists
    this.CIRCUIT_BREAKER_BACKOFF_MS = 60000; // 60s pause if MSG91/Meta rate-limit or spam flag encountered
    this.isFestivalRunning = false;
  }

  /**
   * Check if current time is within allowed festival sending window (06:00 AM to 07:00 AM IST)
   * @param {Date} [now]
   * @returns {boolean}
   */
  isWithinAllowedFestivalWindow(now = new Date()) {
    const istDate = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    const hour = istDate.getHours();
    return hour >= 6 && hour < 7;
  }

  /**
   * Get milliseconds remaining until 07:00:00 AM IST today
   * @param {Date} [now]
   * @returns {number}
   */
  getRemainingWindowMs(now = new Date()) {
    const istDate = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    const target7AM = new Date(istDate);
    target7AM.setHours(7, 0, 0, 0);

    const diff = target7AM.getTime() - istDate.getTime();
    return Math.max(0, diff);
  }

  /**
   * Calculate optimal anti-spam delay between individual messages.
   * Spreads pending messages evenly across the 06:00 AM - 07:00 AM IST window.
   * Enforces a safe floor (>=1000ms) to ensure messages never burst and trigger spam detection.
   *
   * @param {number} remainingCount - Remaining customers to send
   * @param {Date} [now] - Reference time
   * @returns {number} delay in ms
   */
  calculateOptimalMessageDelay(remainingCount, now = new Date()) {
    const remainingMs = this.getRemainingWindowMs(now);

    if (remainingMs > 0 && remainingCount > 0) {
      // 5-minute safety margin before 7:00 AM
      const effectiveWindowMs = Math.max(1000, remainingMs - 5 * 60 * 1000);
      const idealDelay = Math.floor(effectiveWindowMs / remainingCount);
      return Math.max(
        this.MIN_DELAY_PER_MSG_MS,
        Math.min(this.MAX_DELAY_PER_MSG_MS, idealDelay),
      );
    }

    return 1200; // Safe default
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
   * @param {Object} [options] - Options (e.g. forceWindowOverride)
   */
  async processWishesReminders(options = {}) {
    try {
      this.logInfo("Processing wishes reminders...");
      this.dailySummaryMap = {};

      // 1. Process birthdays and anniversaries first
      await Promise.all([
        this.processBirthdayWishes(),
        this.processAnniversaryWishes(),
      ]);

      // 2. Deliver morning summary to shop owners immediately
      await Promise.all(
        Object.entries(this.dailySummaryMap).map(([shopId, data]) =>
          this.sendDailySummary(shopId, data.birthdays, data.anniversaries),
        ),
      );

      // 3. Process bulk festival wishes in small, paced anti-spam batches (6:00 AM - 7:00 AM IST)
      await this.processFestivalWishes(options);

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
        1: getFirstName(customer),
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
        1: getFirstName(customer),
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
   * Enforces 06:00 AM - 07:00 AM IST execution window
   * @param {Object} [options]
   */
  async processFestivalWishes(options = {}) {
    if (this.isFestivalRunning) {
      this.logInfo(
        "Festival wishes processing is already active in background, skipping duplicate run",
      );
      return;
    }

    this.isFestivalRunning = true;
    try {
      const isWithinWindow = this.isWithinAllowedFestivalWindow();
      if (!isWithinWindow && !options.forceWindowOverride) {
        this.logInfo(
          "Current time is outside the allowed festival window (06:00 AM - 07:00 AM IST). Skipping festival send for now.",
        );
        return;
      }

      this.logInfo("Processing festival wishes...");
      const today = getISTTodayParts();
      const festivals = await FestivalSchedule.find({
        status: { $in: ["Pending", "Processing"] },
        deleted_at: null,
      }).lean();

      const todayFestivals = festivals.filter((festival) => {
        const { date, month, year } = getISTDateParts(festival.schedule_date);
        return date === today.date && month === today.month && year === today.year;
      });

      this.logInfo(`Found ${todayFestivals.length} festival schedule(s) for today`);

      for (const festival of todayFestivals) {
        await this.processFestivalForShop(festival, options);
      }
    } catch (error) {
      this.logError("processFestivalWishes", error);
    } finally {
      this.isFestivalRunning = false;
    }
  }

  /**
   * Process festival wishes for a shop with robust anti-spam throttling (06:00 AM - 07:00 AM IST window)
   * Sends in small batches (10 customers) with adaptive spacing (1.0s - 3.5s + jitter) to avoid MSG91 / Meta 131048 rate limits.
   *
   * @param {Object} festival - FestivalSchedule object
   * @param {Object} [options] - Options (e.g. forceWindowOverride)
   */
  async processFestivalForShop(festival, options = {}) {
    try {
      this.logInfo(
        `Starting festival wish campaign "${festival.festival_name}" for shop ${festival.shop_id}`,
      );

      // Pre-fetch shop details once
      const shop = await Shop.findById(festival.shop_id).lean();

      // Query active customers in lightweight lean mode
      const allCustomers = await Customer.find({
        shop_id: festival.shop_id,
        deleted_at: null,
      })
        .select("_id customer_id first_name full_name whatsapp_number shop_id")
        .lean();

      const totalCustomers = allCustomers.length;
      if (totalCustomers === 0) {
        this.logInfo(`No customers found for shop ${festival.shop_id}`);
        await FestivalSchedule.findByIdAndUpdate(festival._id, {
          festival_wishes_sent: 0,
          status: "Completed",
        });
        return;
      }

      const templateName = festival.template_name || "festival_wish";
      const customTemplateKey = `${templateName}_${festival._id}`;

      // 1. Fetch successfully sent ReminderLogs for this festival schedule
      // Exclude FAILED or spam-limited logs so legitimate failures can be retried
      const successfulLogs = await ReminderLog.find({
        shop_id: festival.shop_id,
        template_name: customTemplateKey,
        message_status: { $in: ["SENT", "DELIVERED", "READ"] },
        failure_reason: { $not: /131048|spam/i },
        deleted_at: null,
      })
        .select("entity_id recipient_number")
        .lean();

      const sentCustomerIdSet = new Set(
        successfulLogs.map((l) => String(l.entity_id)),
      );
      const sentPhoneSet = new Set(
        successfulLogs
          .map((l) => formatPhoneNumber(l.recipient_number))
          .filter(Boolean),
      );

      // 2. Filter down to customers who have NOT yet received the message
      const pendingCustomers = allCustomers.filter((c) => {
        if (sentCustomerIdSet.has(String(c.customer_id))) return false;
        const phone = formatPhoneNumber(c.whatsapp_number);
        if (phone && sentPhoneSet.has(phone)) return false;
        return true;
      });

      const alreadySentCount = totalCustomers - pendingCustomers.length;

      this.logInfo(
        `Festival "${festival.festival_name}": ${alreadySentCount}/${totalCustomers} already sent, ${pendingCustomers.length} pending.`,
      );

      // If all customers already received it, mark Completed
      if (pendingCustomers.length === 0) {
        await FestivalSchedule.findByIdAndUpdate(festival._id, {
          festival_wishes_sent: totalCustomers,
          status: "Completed",
        });
        this.logInfo(
          `Festival "${festival.festival_name}" is already completed (${totalCustomers}/${totalCustomers}).`,
        );
        return;
      }

      // Mark as Processing
      await FestivalSchedule.findByIdAndUpdate(festival._id, {
        status: "Processing",
        festival_wishes_sent: alreadySentCount,
      });

      let totalSentCount = alreadySentCount;
      let consecutiveRateLimitHits = 0;
      const MAX_CONSECUTIVE_RATE_LIMITS = 3;

      // 3. Process in small anti-spam batches (10 customers) with adaptive spacing
      for (
        let i = 0;
        i < pendingCustomers.length;
        i += this.FESTIVAL_BATCH_SIZE
      ) {
        // Enforce 6:00 AM - 7:00 AM IST window
        if (!options.forceWindowOverride && !this.isWithinAllowedFestivalWindow()) {
          this.logWarn(
            `Festival window (06:00 - 07:00 AM IST) closed. Pausing festival campaign "${festival.festival_name}". Progress: ${totalSentCount}/${totalCustomers}`,
          );
          await FestivalSchedule.findByIdAndUpdate(festival._id, {
            festival_wishes_sent: totalSentCount,
            status: "Processing",
          });
          return;
        }

        const batch = pendingCustomers.slice(i, i + this.FESTIVAL_BATCH_SIZE);
        const optimalDelayMs = this.calculateOptimalMessageDelay(
          pendingCustomers.length - i,
        );

        for (const customer of batch) {
          // Re-check window before sending each individual message
          if (!options.forceWindowOverride && !this.isWithinAllowedFestivalWindow()) {
            this.logWarn("Window reached 7:00 AM IST limit during batch execution. Stopping.");
            await FestivalSchedule.findByIdAndUpdate(festival._id, {
              festival_wishes_sent: totalSentCount,
              status: "Processing",
            });
            return;
          }

          const res = await this.sendFestivalWish(customer, shop, festival, {
            templateKey: customTemplateKey,
            skipAlreadySentCheck: true, // already filtered above
          });

          if (res.success && !res.skipped) {
            totalSentCount++;
            consecutiveRateLimitHits = 0;
          } else if (
            res.isRateLimit ||
            (res.error && /spam|rate limit|131048/i.test(res.error))
          ) {
            consecutiveRateLimitHits++;
            this.logWarn(
              `Rate limit / spam warning detected from MSG91 for customer ${customer.customer_id}. Consecutive hits: ${consecutiveRateLimitHits}. Pausing for ${this.CIRCUIT_BREAKER_BACKOFF_MS / 1000}s cooldown...`,
            );

            await new Promise((resolve) =>
              setTimeout(resolve, this.CIRCUIT_BREAKER_BACKOFF_MS),
            );

            if (consecutiveRateLimitHits >= MAX_CONSECUTIVE_RATE_LIMITS) {
              this.logError(
                "processFestivalForShop",
                new Error(
                  `Exceeded ${MAX_CONSECUTIVE_RATE_LIMITS} consecutive rate limit errors from MSG91/Meta. Pausing campaign to protect account quality score.`,
                ),
              );
              await FestivalSchedule.findByIdAndUpdate(festival._id, {
                festival_wishes_sent: totalSentCount,
                status: "Processing",
              });
              return;
            }
          }

          // Anti-spam jitter delay (e.g. 1100ms + random 0-300ms)
          const jitter = Math.floor(Math.random() * 300);
          await new Promise((resolve) =>
            setTimeout(resolve, optimalDelayMs + jitter),
          );
        }

        // Persist batch progress to DB immediately
        await FestivalSchedule.findByIdAndUpdate(festival._id, {
          festival_wishes_sent: totalSentCount,
        });

        this.logInfo(
          `Festival "${festival.festival_name}" Progress: ${totalSentCount}/${totalCustomers} sent (${pendingCustomers.length - (i + batch.length)} remaining in queue)`,
        );

        // Cooldown pause between batches of 10
        if (i + this.FESTIVAL_BATCH_SIZE < pendingCustomers.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.FESTIVAL_BATCH_COOLDOWN_MS),
          );
        }
      }

      // Check if all customers were completed
      if (totalSentCount >= totalCustomers) {
        await FestivalSchedule.findByIdAndUpdate(festival._id, {
          festival_wishes_sent: totalSentCount,
          status: "Completed",
        });
        this.logInfo(
          `Festival "${festival.festival_name}" completed successfully: ${totalSentCount}/${totalCustomers} wishes sent`,
        );
      } else {
        await FestivalSchedule.findByIdAndUpdate(festival._id, {
          festival_wishes_sent: totalSentCount,
          status: "Processing",
        });
        this.logInfo(
          `Festival "${festival.festival_name}" batch finished for now: ${totalSentCount}/${totalCustomers} sent`,
        );
      }
    } catch (error) {
      this.logError("processFestivalForShop", error, {
        festivalId: festival._id,
      });
    }
  }

  /**
   * Reset spam-flagged or failed reminder logs for a festival schedule
   * Allows retrying customers who failed due to rate limits or spam restrictions.
   * @param {string|mongoose.Types.ObjectId} festivalId
   * @returns {Promise<{ resetCount: number, validSentCount: number }>}
   */
  async resetFailedFestivalWishLogs(festivalId) {
    const festival = await FestivalSchedule.findById(festivalId);
    if (!festival) throw new Error("Festival schedule not found");

    const templateName = festival.template_name || "festival_wish";
    const customTemplateKey = `${templateName}_${festival._id}`;

    // Update reminder logs that hit rate limits or failed to FAILED
    const updateResult = await ReminderLog.updateMany(
      {
        shop_id: festival.shop_id,
        template_name: customTemplateKey,
        $or: [
          { message_status: "FAILED" },
          { failure_reason: /131048|spam/i },
        ],
      },
      {
        $set: {
          message_status: "FAILED",
          deleted_at: new Date(), // Soft-delete so isReminderAlreadySent won't block re-sending
        },
      },
    );

    const validSentCount = await ReminderLog.countDocuments({
      shop_id: festival.shop_id,
      template_name: customTemplateKey,
      message_status: { $in: ["SENT", "DELIVERED", "READ"] },
      deleted_at: null,
    });

    await FestivalSchedule.findByIdAndUpdate(festivalId, {
      festival_wishes_sent: validSentCount,
      status: "Pending",
    });

    this.logInfo(
      `Reset festival ${festival.festival_name}: valid sent = ${validSentCount}, reset logs = ${updateResult.modifiedCount}`,
    );

    return { resetCount: updateResult.modifiedCount, validSentCount };
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
      const templateName = festival.template_name || "festival_wish";
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

      const shopName = getShopName(shop);

      let variables;
      let messageContent;

      const presetTemplates = {
        navratri_wish: {
          getMessageContent: (sName) =>
            `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को नवरात्रि की हार्दिक शुभकामनाएं! ✨\n\nमाँ दुर्गा से प्रार्थना है कि यह पावन अवसर आपके जीवन में\nशक्ति, खुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n${sName} की ओर से`,
          variables: (sName) => ({ 1: sName }),
        },
        pushyanakshatra_wish: {
          getMessageContent: (sName) =>
            `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को शुभ पुष्य नक्षत्र की हार्दिक शुभकामनाएं! ✨\n\nईश्वर से प्रार्थना है कि इस शुभ दिन की गई खरीदारी आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n${sName} की ओर से`,
          variables: (sName) => ({ 1: sName }),
        },
        dussehra_wish: {
          getMessageContent: (sName) =>
            `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को विजयादशमी (दशहरा) की हार्दिक शुभकामनाएं! ✨\n\nईश्वर से प्रार्थना है कि बुराई पर अच्छाई की जीत का यह पावन पर्व आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n${sName} की ओर से`,
          variables: (sName) => ({ 1: sName }),
        },
        dhanteras_wish: {
          getMessageContent: (sName) =>
            `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को धनतेरस की हार्दिक शुभकामनाएं! ✨\n\nमाँ लक्ष्मी और भगवान धन्वंतरि से प्रार्थना है कि यह पावन अवसर आपके जीवन में\nखुशियां, समृद्धि और अच्छा स्वास्थ्य लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n${sName} की ओर से`,
          variables: (sName) => ({ 1: sName }),
        },
        diwali_wish: {
          getMessageContent: (sName) =>
            `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को दीपावली की हार्दिक शुभकामनाएं! ✨\n\nमाँ लक्ष्मी और भगवान गणेश से प्रार्थना है कि यह पावन अवसर आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n${sName} की ओर से`,
          variables: (sName) => ({ 1: sName }),
        },
        govardhan_wish: {
          getMessageContent: (sName) =>
            `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को गोवर्धन पूजा की हार्दिक शुभकामनाएं! ✨\n\nभगवान श्रीकृष्ण से प्रार्थना है कि यह पावन अवसर आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n${sName} की ओर से`,
          variables: (sName) => ({ 1: sName }),
        },
        bhaidooj_wish: {
          getMessageContent: (sName) =>
            `नमस्ते आदरणीय ग्राहक 😊\n\n✨ आपको और आपके परिवार को भाई दूज की हार्दिक शुभकामनाएं! ✨\n\nईश्वर से प्रार्थना है कि भाई-बहन का यह पावन प्रेम आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n${sName} की ओर से`,
          variables: (sName) => ({ 1: sName }),
        },
      };

      if (presetTemplates[templateName]) {
        const preset = presetTemplates[templateName];
        variables = preset.variables(shopName);
        messageContent = preset.getMessageContent(shopName);
      } else {
        variables = {
          1: getFirstName(customer),
          2: festival.festival_name,
          3: shopName,
        };
        messageContent = `नमस्ते ${variables[1]} जी 😊\n\n✨ आपको और आपके परिवार को ${variables[2]} की हार्दिक शुभकामनाएं! ✨\n\nईश्वर से प्रार्थना है कि यह पावन अवसर आपके जीवन में\nखुशियां, समृद्धि और सफलता लेकर आए 🙏\n\n🎁 आपका साथ और विश्वास हमारे लिए अनमोल है।\nइसी तरह अपना स्नेह बनाए रखें ❤️\n\nधन्यवाद!\n${variables[3]} की ओर से`;
      }

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
        languageCode: "hi",
        variables,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: templateName,
          customerName: customer.full_name,
          festivalName: festival.festival_name,
          messageType: templateName,
        },
      });

      if (result.success) {
        return { success: true };
      } else {
        this.logError("sendFestivalWish", new Error(result.error), {
          customerId: customer.customer_id,
        });
        return {
          success: false,
          error: result.error,
          isRateLimit: result.isRateLimit,
        };
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
          name: getFirstName(c),
          whatsapp_number: c.whatsapp_number,
          type: "जन्मदिन",
        })),
        ...todayAnniversaries.map((c) => ({
          name: getFirstName(c),
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
