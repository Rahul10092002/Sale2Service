import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import ServiceSchedule from "../../models/ServiceSchedule.js";
import Shop from "../../models/Shop.js";
import {
  createDateRange,
  formatDateForMessage,
  getShopName,
} from "../core/utils.js";

/**
 * Service-specific reminder scheduler
 * Handles upcoming and missed service reminders
 */
export default class ServiceReminderScheduler extends BaseScheduler {
  constructor() {
    super();
    this.messageSender = new MessageSender();
  }

  /**
   * Process all service reminders
   * @param {boolean} forceResend - Skip dedup check (for testing)
   */
  async processServiceReminders(forceResend = false) {
    try {
      this.logInfo("Processing service reminders...");

      await Promise.all([
        this.processUpcomingServices(forceResend),
        this.processMissedServices(forceResend),
      ]);

      this.logInfo("Service reminders processing completed");
    } catch (error) {
      this.logError("processServiceReminders", error);
    }
  }

  /**
   * Process upcoming service reminders (3 days and 1 day before)
   * @param {boolean} forceResend - Skip dedup check (for testing)
   */
  async processUpcomingServices(forceResend = false) {
    try {
      // Check 3 days ahead
      const threeDaysRange = createDateRange(3);
      const oneDayRange = createDateRange(1);

      const upcomingServices = await ServiceSchedule.find({
        $or: [
          {
            scheduled_date: {
              $gte: threeDaysRange.start,
              $lt: threeDaysRange.end,
            },
          },
          {
            scheduled_date: {
              $gte: oneDayRange.start,
              $lt: oneDayRange.end,
            },
          },
        ],
        status: "PENDING",
        deleted_at: null,
      }).populate({
        path: "service_plan_id",
        populate: {
          path: "invoice_item_id",
          populate: {
            path: "invoice_id",
            populate: {
              path: "customer_id",
            },
          },
        },
      });

      this.logInfo(`Found ${upcomingServices.length} upcoming services`);

      for (const service of upcomingServices) {
        await this.sendUpcomingServiceReminder(service, forceResend);
      }
    } catch (error) {
      this.logError("processUpcomingServices", error);
    }
  }

  /**
   * Process missed service reminders (past due date)
   * @param {boolean} forceResend - Skip dedup check (for testing)
   */
  async processMissedServices(forceResend = false) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const missedServices = await ServiceSchedule.find({
        scheduled_date: { $lt: today },
        status: "PENDING",
        deleted_at: null,
      }).populate({
        path: "service_plan_id",
        populate: {
          path: "invoice_item_id",
          populate: {
            path: "invoice_id",
            populate: {
              path: "customer_id",
            },
          },
        },
      });

      this.logInfo(`Found ${missedServices.length} missed services`);

      for (const service of missedServices) {
        await this.sendMissedServiceReminder(service, forceResend);
      }
    } catch (error) {
      this.logError("processMissedServices", error);
    }
  }

  /**
   * Send upcoming service reminder
   * @param {Object} serviceSchedule - Service schedule object
   * @param {boolean} forceResend - Skip dedup check (for testing)
   */
  async sendUpcomingServiceReminder(serviceSchedule, forceResend = false) {
    try {
      // Validate service schedule structure
      if (
        !serviceSchedule.service_plan_id?.invoice_item_id?.invoice_id
          ?.customer_id
      ) {
        const missingLink = !serviceSchedule.service_plan_id
          ? "service_plan_id"
          : !serviceSchedule.service_plan_id.invoice_item_id
            ? "invoice_item_id"
            : !serviceSchedule.service_plan_id.invoice_item_id.invoice_id
              ? "invoice_id"
              : "customer_id";
        this.logInfo(
          `Cancelling orphaned service schedule (${missingLink} missing): ${serviceSchedule.service_schedule_id}`,
        );
        await ServiceSchedule.findByIdAndUpdate(serviceSchedule._id, {
          status: "CANCELLED",
          notes: `Auto-cancelled: ${missingLink} reference no longer exists`,
        });
        return;
      }

      const invoiceItem = serviceSchedule.service_plan_id.invoice_item_id;
      const customer = invoiceItem.invoice_id.customer_id;

      // Check if reminder already sent
      const alreadySent =
        !forceResend &&
        (await this.isReminderAlreadySent(
          serviceSchedule.service_schedule_id,
          "SERVICE",
          "service_reminder_hindi",
          24, // allow re-send after 24 hours (1 day)
        ));

      if (alreadySent) {
        this.logInfo(
          `Service reminder already sent for schedule ${serviceSchedule.service_schedule_id}`,
        );
        return;
      }

      // Validate phone number
      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError(
          "sendUpcomingServiceReminder",
          new Error(phoneValidation.error),
          {
            customer: customer.full_name,
            serviceId: serviceSchedule.service_schedule_id,
          },
        );
        return;
      }

      // Get shop information
      const shop = await Shop.findById(invoiceItem.invoice_id.shop_id);
      if (!shop || shop.deleted_at) {
        this.logError(
          "sendUpcomingServiceReminder",
          new Error("Shop not found"),
          {
            shopId: invoiceItem.invoice_id.shop_id,
          },
        );
        return;
      }

      // Prepare template variables for service_reminder_hindi
      // {{1}}: Customer name, {{2}}: Product name, {{3}}: Service date, {{4}}: Shop name
      const serviceDate = formatDateForMessage(serviceSchedule.scheduled_date);
      const variables = {
        1: customer.full_name,
        2: invoiceItem.product_name,
        3: serviceDate,
        4: getShopName(shop),
      };

      // Build message content for logging
      const messageContent = `नमस्ते ${variables[1]},\n\nआपकी ${variables[2]} की सर्विस की अगली तिथि ${variables[3]} को निर्धारित है।\n\nकृपया समय पर सर्विस करवा लें ताकि बेहतर प्रदर्शन बना रहे।\n\nअधिक जानकारी के लिए संपर्क करें: ${variables[4]}\nधन्यवाद 🙏`;

      // Create reminder log
      const reminderLog = await this.createReminderLog({
        entityId: serviceSchedule.service_schedule_id,
        entityType: "SERVICE",
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent: messageContent,
        templateName: "service_reminder_hindi",
      });

      // Send WhatsApp message
      const result = await this.messageSender.sendTemplateMessage({
        to: phoneValidation.formattedNumber,
        templateName: "service_reminder_hindi",
        variables: variables,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: "service_reminder",
          shopId: shop._id,
          customerName: customer.full_name,
          messageType: "service_reminder",
        },
      });

      if (result.success) {
        this.logInfo(`Service reminder sent successfully`, {
          customer: customer.full_name,
          product: invoiceItem.product_name,
          serviceDate,
        });
      } else {
        this.logError("sendUpcomingServiceReminder", new Error(result.error), {
          customer: customer.full_name,
          serviceId: serviceSchedule.service_schedule_id,
        });
      }
    } catch (error) {
      this.logError("sendUpcomingServiceReminder", error, {
        serviceId: serviceSchedule.service_schedule_id,
      });
    }
  }

  /**
   * Send missed service reminder
   * @param {Object} serviceSchedule - Service schedule object
   * @param {boolean} forceResend - Skip dedup check (for testing)
   */
  async sendMissedServiceReminder(serviceSchedule, forceResend = false) {
    try {
      // Validate service schedule structure
      if (
        !serviceSchedule.service_plan_id?.invoice_item_id?.invoice_id
          ?.customer_id
      ) {
        const missingLink = !serviceSchedule.service_plan_id
          ? "service_plan_id"
          : !serviceSchedule.service_plan_id.invoice_item_id
            ? "invoice_item_id"
            : !serviceSchedule.service_plan_id.invoice_item_id.invoice_id
              ? "invoice_id"
              : "customer_id";
        this.logInfo(
          `Cancelling orphaned service schedule (${missingLink} missing): ${serviceSchedule.service_schedule_id}`,
        );
        await ServiceSchedule.findByIdAndUpdate(serviceSchedule._id, {
          status: "CANCELLED",
          notes: `Auto-cancelled: ${missingLink} reference no longer exists`,
        });
        return;
      }

      const invoiceItem = serviceSchedule.service_plan_id.invoice_item_id;
      const customer = invoiceItem.invoice_id.customer_id;

      // Check if reminder already sent
      const alreadySent =
        !forceResend &&
        (await this.isReminderAlreadySent(
          serviceSchedule.service_schedule_id,
          "SERVICE",
          "service_missed_v1",
          24, // allow re-send after 24 hours (1 day)
        ));

      if (alreadySent) {
        this.logInfo(
          `Missed service reminder already sent for schedule ${serviceSchedule.service_schedule_id}`,
        );
        return;
      }

      // Validate phone number
      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        this.logError(
          "sendMissedServiceReminder",
          new Error(phoneValidation.error),
          {
            customer: customer.full_name,
            serviceId: serviceSchedule.service_schedule_id,
          },
        );
        return;
      }

      // Get shop information
      const shop = await Shop.findById(invoiceItem.invoice_id.shop_id);
      if (!shop || shop.deleted_at) {
        this.logError(
          "sendMissedServiceReminder",
          new Error("Shop not found"),
          {
            shopId: invoiceItem.invoice_id.shop_id,
          },
        );
        return;
      }

      // Prepare template variables for service_missed_v1
      // {{1}}: Customer name, {{2}}: Product name, {{3}}: Shop name
      const variables = {
        1: customer.full_name,
        2: invoiceItem.product_name,
        3: getShopName(shop),
      };

      // Create reminder log
      const reminderLog = await this.createReminderLog({
        entityId: serviceSchedule.service_schedule_id,
        entityType: "SERVICE",
        recipientNumber: phoneValidation.formattedNumber,
        recipientName: customer.full_name,
        messageContent: `Missed service reminder for ${invoiceItem.product_name}`,
        templateName: "service_missed_v1",
      });

      // Send WhatsApp message
      const result = await this.messageSender.sendTemplateMessage({
        to: phoneValidation.formattedNumber,
        templateName: "service_missed_v1",
        variables: variables,
        reminderLogId: reminderLog._id,
        metadata: {
          campaignName: "service_missed",
          shopId: shop._id,
          customerName: customer.full_name,
          messageType: "service_missed",
        },
      });

      if (result.success) {
        this.logInfo(`Missed service reminder sent successfully`, {
          customer: customer.full_name,
          product: invoiceItem.product_name,
        });
      } else {
        this.logError("sendMissedServiceReminder", new Error(result.error), {
          customer: customer.full_name,
          serviceId: serviceSchedule.service_schedule_id,
        });
      }
    } catch (error) {
      this.logError("sendMissedServiceReminder", error, {
        serviceId: serviceSchedule.service_schedule_id,
      });
    }
  }
}
