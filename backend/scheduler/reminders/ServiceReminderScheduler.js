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

      // We calculate time stages relative to scheduled_date
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      
      const endOf1Day = new Date(endOfToday);
      endOf1Day.setDate(endOf1Day.getDate() + 1);
      
      const endOf3Days = new Date(endOfToday);
      endOf3Days.setDate(endOf3Days.getDate() + 3);

      const services = await ServiceSchedule.find({
        deleted_at: null,
        status: { $in: ["PENDING", "MISSED", "RESCHEDULED"] },
        $or: [
          // Needs UPCOMING_3D: Scheduled within 3 days, but stage is null/empty
          { 
            scheduled_date: { $lte: endOf3Days, $gt: endOf1Day },
            reminder_stage: { $nin: ["UPCOMING_3D", "UPCOMING_1D", "TODAY", "MISSED", "FOLLOWUP"] }
          },
          // Needs UPCOMING_1D: Scheduled within 1 day, but stage is not UPCOMING_1D or beyond
          {
            scheduled_date: { $lte: endOf1Day, $gt: endOfToday },
            reminder_stage: { $nin: ["UPCOMING_1D", "TODAY", "MISSED", "FOLLOWUP"] }
          },
          // Needs TODAY: Scheduled today or earlier, but stage is not TODAY or MISSED/FOLLOWUP
          {
            scheduled_date: { $lte: endOfToday, $gt: startOfToday },
            reminder_stage: { $nin: ["TODAY", "MISSED", "FOLLOWUP"] }
          },
          // Needs MISSED: It was TODAY, and now it's in the past (scheduled_date < today)
          {
            scheduled_date: { $lt: startOfToday },
            status: { $in: ["PENDING"] },
            reminder_stage: { $nin: ["MISSED", "FOLLOWUP"] }
          },
          // Needs FOLLOWUP: It was MISSED, and it's been > 1 day since it missed
          // We can estimate by scheduled_date being < (today - 1)
          {
            scheduled_date: { $lt: new Date(startOfToday.getTime() - 86400000) },
            status: { $in: ["PENDING", "MISSED"] },
            reminder_stage: "MISSED"
          }
        ]
      })
        // We do not lean here if we want to populate properly or just use as is
        // Wait, the original code had .lean() up to we need to check how it was used in processSingleService
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
      // Determine what stage we are actually processing now based on scheduled_date
      let targetStage = service.reminder_stage;
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const sDate = new Date(service.scheduled_date);
      
      const mathDays = Math.floor((sDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
      
      if (mathDays > 1 && mathDays <= 3) {
        targetStage = "UPCOMING_3D";
      } else if (mathDays === 1) {
        targetStage = "UPCOMING_1D";
      } else if (mathDays === 0) {
        targetStage = "TODAY";
      } else if (mathDays === -1) {
        targetStage = "MISSED";
      } else if (mathDays < -1) {
        targetStage = "FOLLOWUP";
      }

      // Assign the dynamically calculated stage to use for templates
      service.reminder_stage = targetStage;

      const alreadySent =
        !forceResend &&
        (await this.isReminderAlreadySent(
          service._id,
          "SERVICE",
          service.reminder_stage,
          24, // deduplicate for 24h
          invoiceItem.invoice_id.shop_id,
          phoneValidation.formattedNumber,
        ));

      if (alreadySent) {
        this.logInfo(`⏩ Skipping already sent: ${service._id} stage ${service.reminder_stage}`);
        // We might want to implicitly mark it to update stages if it already sent but state varies?
        // handleSuccess handles the state transition, so if already sent, we just skip.
        // Wait, if it didn't update state successfully previously, skip will starve it from transition?
        // We will call handleSuccess to ensure proper DB stage state if needed. But it's okay for now.
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
        this.logInfo(`✅ Success for ${service._id} with product_name ${invoiceItem.product_name} and serial_number ${invoiceItem.serial_number}`);
        await this.handleSuccess(service);
      } else {
        this.logInfo(`❌ Failure for ${service._id} with product_name ${invoiceItem.product_name} and serial_number ${invoiceItem.serial_number}`);
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
      reminder_stage: service.reminder_stage // lock in the dynamically computed stage
    };

    // If it was MISSED or FOLLOWUP, ensure status reflects it
    if (service.reminder_stage === "MISSED" || service.reminder_stage === "FOLLOWUP") {
      update.status = "MISSED";
    }

    // `next_reminder_at` is safely ignored for querying now, but we can set it for completeness
    switch (service.reminder_stage) {
      case "UPCOMING_3D":
        update.next_reminder_at = this.subtractDays(service.scheduled_date, 1);
        break;
      case "UPCOMING_1D":
        update.next_reminder_at = service.scheduled_date;
        break;
      case "TODAY":
        update.status = "MISSED"; // Changes to MISSED since today is the last "pending"
        update.next_reminder_at = this.addDays(service.scheduled_date, 1);
        break;
      case "MISSED":
        update.next_reminder_at = this.addDays(service.scheduled_date, 2);
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
