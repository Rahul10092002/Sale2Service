import BaseScheduler from "../core/BaseScheduler.js";
import MessageSender from "../messaging/MessageSender.js";
import Shop from "../../models/Shop.js";
import Invoice from "../../models/Invoice.js";
import Customer from "../../models/Customer.js";
import InvoiceItem from "../../models/InvoiceItem.js";
import EmiReminderDelivery from "../../models/EmiReminderDelivery.js";
import { getShopName } from "../core/utils.js";
import { EMI_TEMPLATE_NAME, upcomingEmis, validateEmi } from "../../../shared/emiSchedule.js";

export default class EmiReminderScheduler extends BaseScheduler {
  constructor() {
    super();
    this.messageSender = new MessageSender();
  }

  async processEmiReminders(now = new Date()) {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      for (const shop of await Shop.find({ deleted_at: null }).lean()) {
        const scope = { shop_id: shop._id, deleted_at: null };
        // Later shop-payment receipts may change payment_mode to CASH/UPI;
        // the separately saved finance plan must continue until disabled/finished.
        const invoices = Invoice.find({ ...scope, "emi.enabled": true }).cursor();
        for await (const invoice of invoices) {
          try {
            if (Object.keys(validateEmi({ payment_mode: "EMI", invoice_date: invoice.invoice_date, emi: invoice.emi })).length) continue;
            const upcoming = upcomingEmis(invoice.emi, now);
            if (!upcoming.length) continue;
            const customer = await Customer.findOne({ ...scope, _id: invoice.customer_id }).lean();
            const phone = this.validateCustomerPhoneNumber(customer);
            if (!phone.isValid) continue;
            const items = await InvoiceItem.find({ ...scope, invoice_id: invoice._id }).select("product_name").lean();
            const product = [...items, ...(invoice.services || [])].map(item => item.product_name).filter(Boolean).join(", ");
            if (!product) continue;
            for (const { dueDate } of upcoming) {
              await this.sendInstallment(shop, invoice, customer, phone.formattedNumber, product, dueDate);
            }
          } catch (error) {
            this.logError("processInvoiceEmi", error, { invoiceId: String(invoice._id) });
          }
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  async sendInstallment(shop, invoice, customer, to, product, dueDate) {
    const key = { shop_id: shop._id, invoice_id: invoice._id, due_date: dueDate };
    let claim;
    try {
      claim = await EmiReminderDelivery.create(key);
    } catch (error) {
      if (error.code !== 11000) throw error;
      claim = await EmiReminderDelivery.findOneAndUpdate(
        { ...key, status: "FAILED", attempts: { $lt: 3 } },
        { $set: { status: "SENDING" }, $inc: { attempts: 1 } }, { new: true },
      );
      if (!claim) return;
    }
    // A crash or ambiguous provider response leaves SENDING for manual review;
    // automatically reclaiming it could send a duplicate accepted message.
    const customerName = customer.full_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ");
    const variables = {
      1: customerName,
      2: product,
      3: Number(invoice.emi.amount).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
      4: dueDate.split("-").reverse().join("-"),
      5: getShopName(shop),
    };
    const log = await this.createReminderLog({
      shopId: shop._id, entityId: `${invoice._id}:${dueDate}`, entityType: "INVOICE",
      recipientNumber: to, recipientName: customerName, templateName: EMI_TEMPLATE_NAME,
      messageContent: JSON.stringify(variables),
    });
    const result = await this.messageSender.sendTemplateMessage({
      to, templateName: EMI_TEMPLATE_NAME, languageCode: "hi", variables, reminderLogId: log._id,
      metadata: { shopId: shop._id, customerName, campaignName: EMI_TEMPLATE_NAME },
    });
    // Retry only explicit provider rejection; transport failures can be ambiguous.
    const status = result.success ? "SENT" : result.result ? "FAILED" : "SENDING";
    await EmiReminderDelivery.updateOne({ ...key, _id: claim._id }, { $set: { status } });
  }
}
