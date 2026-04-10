import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import ServiceSchedule from "../../models/ServiceSchedule.js";
import Shop from "../../models/Shop.js";
import { formatDateForMessage, getShopName, getShopContactInfo } from "../core/utils.js";

export default class ServiceReminderScheduler extends BaseScheduler {
  constructor() {
    super();
    this.messageSender = new MessageSender();
    this.BATCH_SIZE = 50;
  }

  async processServiceReminders(forceResend = false) {
    try {
      this.logInfo("🚀 Service Scheduler Started");

      const now = new Date();

      const services = await ServiceSchedule.find({
        next_reminder_at: { $lte: now },
        deleted_at: null,
        status: { $in: ["PENDING", "MISSED", "RESCHEDULED"] },
      })
        .limit(this.BATCH_SIZE)
        .lean();

      this.logInfo(`Found ${services.length} services to process`);

      for (const service of services) {
        await this.processSingleService(service, forceResend);
      }

      this.logInfo("✅ Service Scheduler Completed");
    } catch (error) {
      this.logError("processServiceReminders", error);
    }
  }

  async processSingleService(service, forceResend) {
    try {
      // 📦 Fetch minimal required data (avoid deep populate)
      const populated = await ServiceSchedule.findById(service._id).populate({
        path: "service_plan_id",
        populate: {
          path: "invoice_item_id",
          populate: {
            path: "invoice_id",
            populate: { path: "customer_id" },
          },
        },
      });

      if (
        !populated?.service_plan_id?.invoice_item_id?.invoice_id?.customer_id
      ) {
        await this.cancelOrphaned(service._id);
        return;
      }

      const invoiceItem = populated.service_plan_id.invoice_item_id;
      const customer = invoiceItem.invoice_id.customer_id;

      // 📞 Phone validation
      const phoneValidation = this.validateCustomerPhoneNumber(customer);
      if (!phoneValidation.isValid) {
        return this.handleFailure(service, "Invalid phone");
      }

      const shop = await Shop.findById(invoiceItem.invoice_id.shop_id);
      if (!shop || shop.deleted_at) {
        return this.handleFailure(service, "Shop not found");
      }

      // 🔒 Dedup check (needs shop_id on log; requires populated invoice)
      const alreadySent =
        !forceResend &&
        (await this.isReminderAlreadySent(
          service._id,
          "SERVICE",
          service.reminder_stage,
          24,
          invoiceItem.invoice_id.shop_id,
          phoneValidation.formattedNumber,
        ));

      if (alreadySent) {
        this.logInfo(`⏩ Skipping already sent: ${service._id}`);
        return;
      }

      // 📩 Send message
      const result = await this.sendMessage(
        service,
        customer,
        invoiceItem,
        shop,
        phoneValidation.formattedNumber,
      );

      if (result.success) {
        await this.handleSuccess(service);
      } else {
        await this.handleFailure(service, result.error);
      }
    } catch (error) {
      this.logError("processSingleService", error);
      await this.handleFailure(service, error.message);
    }
  }

  async sendMessage(service, customer, invoiceItem, shop, phone) {
    const serviceDate = formatDateForMessage(service.scheduled_date);
    const shopContact = getShopContactInfo(shop) || "";

    let templateName;
    let variables;

    switch (service.reminder_stage) {
      case "UPCOMING_3D":
      case "UPCOMING_1D":
      case "TODAY":
        templateName = "service_reminder";

         const getServiceCountHindi = (n) => {
    const map = ["पहली", "दूसरी", "तीसरी", "चौथी", "पांचवीं"];
    return map[n - 1] || `${n}वीं`;
  };
        variables = {
    1: customer.full_name,                     // {{1}}
    2: invoiceItem.product_name,               // {{2}}
    3: invoiceItem.serial_number || "",     // {{3}} ✅ ADD THIS FIELD IN DB
    4: getServiceCountHindi(service.service_number || 1), // {{4}}
    5: shopContact,                            // {{5}}
    6: getShopName(shop),                      // {{6}}
  };
        break;

      case "MISSED":
      case "FOLLOWUP":
        templateName = "service_missed_v1";
        variables = {
          1: customer.full_name,
          2: invoiceItem.product_name,
          3: getShopName(shop),
        };
        break;

      default:
        throw new Error("Unknown reminder stage");
    }

    const reminderLog = await this.createReminderLog({
      entityId: String(service._id),
      entityType: "SERVICE",
      shopId: invoiceItem.invoice_id.shop_id,
      recipientNumber: phone,
      recipientName: customer.full_name,
      messageContent: `Service reminder (${service.reminder_stage}) for ${invoiceItem.product_name}`,
      templateName: service.reminder_stage,
    });

    return await this.messageSender.sendTemplateMessage({
      to: phone,
      templateName,
      variables,
      buttons: [shopContact],
      reminderLogId: reminderLog._id,
      metadata: {
        serviceId: service._id,
        stage: service.reminder_stage,
        shopId: shop._id,
      },
    });
  }

  async handleSuccess(service) {
    const update = {
      last_reminder_sent_at: new Date(),
      retry_count: 0,
    };

    // 🔄 Move to next stage
    switch (service.reminder_stage) {
      case "UPCOMING_3D":
        update.reminder_stage = "UPCOMING_1D";
        update.next_reminder_at = this.subtractDays(service.scheduled_date, 1);
        break;

      case "UPCOMING_1D":
        update.reminder_stage = "TODAY";
        update.next_reminder_at = service.scheduled_date;
        break;

      case "TODAY":
        update.reminder_stage = "MISSED";
        update.status = "MISSED";
        update.next_reminder_at = this.addDays(new Date(), 1);
        break;

      case "MISSED":
        update.reminder_stage = "FOLLOWUP";
        update.next_reminder_at = this.addDays(new Date(), 2);
        break;

      case "FOLLOWUP":
        update.next_reminder_at = null; // stop
        break;
    }

    await ServiceSchedule.findByIdAndUpdate(service._id, update);

    this.logInfo(`✅ Success for ${service._id}`);
  }

  async handleFailure(service, error) {
    this.logError("handleFailure", new Error(error));

    if (service.retry_count >= service.max_retries) {
      await ServiceSchedule.findByIdAndUpdate(service._id, {
        next_reminder_at: null,
        failure_reason: error,
      });
      return;
    }

    await ServiceSchedule.findByIdAndUpdate(service._id, {
      retry_count: service.retry_count + 1,
      next_reminder_at: this.addMinutes(new Date(), 30),
    });
  }

  async cancelOrphaned(serviceId) {
    await ServiceSchedule.findByIdAndUpdate(serviceId, {
      status: "CANCELLED",
      next_reminder_at: null,
    });
  }

  // 🛠 Helpers
  subtractDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() - days);
    return d;
  }

  addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  addMinutes(date, mins) {
    return new Date(date.getTime() + mins * 60000);
  }
}
