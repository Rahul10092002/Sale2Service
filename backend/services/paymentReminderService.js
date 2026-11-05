import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import Shop from "../models/Shop.js";
import ReminderLog from "../models/ReminderLog.js";
import CustomerPaymentReminderState from "../models/CustomerPaymentReminderState.js";
import { sendWhatsappMessageViaMSG91 } from "../config/msg91.js";
import {
  formatPhoneNumber,
  isValidWhatsAppNumber,
  getFirstName,
} from "../scheduler/core/utils.js";

/**
 * Pure Utility: Format date to YYYY-MM-DD in given timezone
 */
export function getLocalDateString(date, timezone = "Asia/Kolkata") {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d); // "YYYY-MM-DD"
}

/**
 * Pure Utility: Calculate calendar day difference (dateStr2 - dateStr1)
 */
export function getDayDifference(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return 0;
  const [y1, m1, d1] = dateStr1.split("-").map(Number);
  const [y2, m2, d2] = dateStr2.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Pure Utility: Add calendar days to a date in given timezone
 */
export function addCalendarDays(date, days, timezone = "Asia/Kolkata") {
  const d = new Date(date || new Date());
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Pure Utility: Format amount in Indian currency format WITHOUT currency symbol
 * e.g. 10500 -> "10,500" or 10500.50 -> "10,500.50"
 */
export function formatAmountWithoutCurrency(amount) {
  const num = Math.round(Number(amount || 0) * 100) / 100;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Pure Utility: Format date to DD/MM/YYYY in given timezone
 */
export function formatDateDMY(date, timezone = "Asia/Kolkata") {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return formatter.format(d); // "DD/MM/YYYY"
}

/**
 * Pure Utility: Calculate outstanding due amount for an invoice
 */
export function calculateInvoiceDue(invoice) {
  if (!invoice) return 0;
  if (invoice.payment_status === "PAID") return 0;
  const gross = Number(invoice.total_amount || 0);
  const paid = Number(invoice.amount_paid || 0);
  const exchangeCredit = Number(invoice.excess_exchange_credit || 0);
  const due = Math.max(0, gross - paid - exchangeCredit);
  return Math.round(due * 100) / 100;
}

/**
 * Pure Utility: Classify customer invoices into Overdue and Upcoming batches
 */
export function classifyCustomerInvoices({
  invoices = [],
  targetDate = new Date(),
  timezone = "Asia/Kolkata",
}) {
  const targetLocalDateStr = getLocalDateString(targetDate, timezone);

  const overdueInvoices = [];
  const upcomingInvoices = [];

  for (const inv of invoices) {
    if (inv.deleted_at) continue;
    const dueAmount = calculateInvoiceDue(inv);
    if (dueAmount <= 0.01) continue;

    // Use due_date or fallback to invoice_date or createdAt
    const effectiveDueDate = inv.due_date || inv.invoice_date || inv.createdAt;
    const dueLocalDateStr = getLocalDateString(effectiveDueDate, timezone);

    const invData = {
      ...inv,
      dueAmount,
      effectiveDueDate,
      dueLocalDateStr,
    };

    if (dueLocalDateStr < targetLocalDateStr) {
      const daysOverdue = getDayDifference(dueLocalDateStr, targetLocalDateStr);
      overdueInvoices.push({
        ...invData,
        daysOverdue,
      });
    } else {
      const daysUntilDue = getDayDifference(targetLocalDateStr, dueLocalDateStr);
      upcomingInvoices.push({
        ...invData,
        daysUntilDue,
      });
    }
  }

  // Sort Overdue by oldest due date first (ascending)
  overdueInvoices.sort((a, b) => new Date(a.effectiveDueDate) - new Date(b.effectiveDueDate));

  // Sort Upcoming by nearest due date first (ascending)
  upcomingInvoices.sort((a, b) => new Date(a.effectiveDueDate) - new Date(b.effectiveDueDate));

  // Overdue stats
  const overdueCount = overdueInvoices.length;
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
  const oldestOverdue = overdueInvoices[0] || null;
  const daysSinceOldestDue = oldestOverdue ? oldestOverdue.daysOverdue : 0;
  // Overdue initial eligibility rule: at least 7 calendar days overdue
  const isOverdueEligibleByDays = overdueCount > 0 && daysSinceOldestDue >= 7;

  // Upcoming stats: Filter for those within 3 calendar days lead window
  const eligibleUpcomingInvoices = upcomingInvoices.filter((inv) => inv.daysUntilDue <= 3);
  const nearestUpcoming = eligibleUpcomingInvoices[0] || upcomingInvoices[0] || null;
  const isUpcomingEligibleByDays =
    eligibleUpcomingInvoices.length > 0 &&
    nearestUpcoming &&
    nearestUpcoming.daysUntilDue <= 3 &&
    nearestUpcoming.daysUntilDue >= 0;

  // Total upcoming stats (using eligible upcoming within window, or all upcoming)
  const upcomingCount = eligibleUpcomingInvoices.length > 0 ? eligibleUpcomingInvoices.length : upcomingInvoices.length;
  const upcomingAmount = (eligibleUpcomingInvoices.length > 0 ? eligibleUpcomingInvoices : upcomingInvoices).reduce(
    (sum, inv) => sum + inv.dueAmount,
    0
  );

  return {
    targetLocalDateStr,
    overdue: {
      count: overdueCount,
      totalDue: Math.round(overdueAmount * 100) / 100,
      oldestDueDate: oldestOverdue ? oldestOverdue.effectiveDueDate : null,
      daysSinceOldestDue,
      invoices: overdueInvoices,
      isEligibleByDays: isOverdueEligibleByDays,
    },
    upcoming: {
      count: upcomingCount,
      totalDue: Math.round(upcomingAmount * 100) / 100,
      nearestDueDate: nearestUpcoming ? nearestUpcoming.effectiveDueDate : null,
      daysUntilNearestDue: nearestUpcoming ? nearestUpcoming.daysUntilDue : null,
      invoices: eligibleUpcomingInvoices.length > 0 ? eligibleUpcomingInvoices : upcomingInvoices,
      allUpcomingInvoices: upcomingInvoices,
      isEligibleByDays: isUpcomingEligibleByDays,
    },
  };
}

/**
 * Main Service Class for Customer-Level Consolidated WhatsApp Payment Reminders
 */
export class PaymentReminderService {
  /**
   * Evaluates eligibility for customer payment reminders incorporating:
   * - 7-day overdue delay rule and 7-day interval cadence
   * - 3-day upcoming lead time
   * - Customer coordination (Overdue takes priority over Upcoming on same day)
   * - Settled state detection
   */
  static async evaluateCustomerReminder({
    shopId,
    customerId,
    targetDate = new Date(),
    shopDoc = null,
    customerDoc = null,
  }) {
    const shop = shopDoc || (await Shop.findById(shopId).lean());
    if (!shop || shop.deleted_at) {
      throw new Error("Shop not found or inactive");
    }

    const customer =
      customerDoc ||
      (await Customer.findOne({
        _id: customerId,
        shop_id: shopId,
        deleted_at: null,
      }).lean());

    if (!customer) {
      throw new Error("Customer not found or inactive");
    }

    const timezone = shop.timezone || "Asia/Kolkata";
    const targetLocalDateStr = getLocalDateString(targetDate, timezone);

    // Fetch active unpaid or partially paid invoices
    const invoices = await Invoice.find({
      shop_id: shopId,
      customer_id: customerId,
      payment_status: { $in: ["UNPAID", "PARTIAL"] },
      deleted_at: null,
    }).lean();

    const classification = classifyCustomerInvoices({
      invoices,
      targetDate,
      timezone,
    });

    // Check phone validity
    const rawPhone = customer.whatsapp_number || customer.phone || customer.mobile_number || "";
    const cleanPhone = formatPhoneNumber(rawPhone);
    const hasValidPhone = Boolean(cleanPhone && isValidWhatsAppNumber(cleanPhone));

    // Fetch existing state records for this customer
    const [overdueState, upcomingState] = await Promise.all([
      CustomerPaymentReminderState.findOne({
        shop_id: shopId,
        customer_id: customerId,
        reminder_category: "OVERDUE",
        deleted_at: null,
      }),
      CustomerPaymentReminderState.findOne({
        shop_id: shopId,
        customer_id: customerId,
        reminder_category: "UPCOMING",
        deleted_at: null,
      }),
    ]);

    // Check Overdue canSend
    let overdueCanSend = false;
    let overdueReason = "";
    if (classification.overdue.count === 0) {
      overdueReason = "No overdue invoices";
      // Auto-settle overdue state if active
      if (overdueState && overdueState.cycle_status === "ACTIVE") {
        overdueState.cycle_status = "SETTLED";
        overdueState.next_eligible_date = null;
        await overdueState.save();
      }
    } else if (!classification.overdue.isEligibleByDays) {
      overdueReason = `Oldest overdue invoice is ${classification.overdue.daysSinceOldestDue} days overdue (must be >= 7 days)`;
    } else if (overdueState && overdueState.cycle_status === "ACTIVE" && overdueState.next_eligible_date) {
      const nextEligibleStr = getLocalDateString(overdueState.next_eligible_date, timezone);
      if (targetLocalDateStr < nextEligibleStr) {
        overdueCanSend = false;
        overdueReason = `7-day interval active. Next eligible date: ${nextEligibleStr}`;
      } else {
        overdueCanSend = true;
        overdueReason = "Eligible for recurring overdue reminder (7 days elapsed)";
      }
    } else {
      overdueCanSend = true;
      overdueReason = "Eligible for initial overdue reminder";
    }

    // Check Upcoming canSend
    let upcomingCanSend = false;
    let upcomingReason = "";
    if (classification.upcoming.count === 0) {
      upcomingReason = "No upcoming invoices";
      if (upcomingState && upcomingState.cycle_status === "ACTIVE") {
        upcomingState.cycle_status = "SETTLED";
        upcomingState.next_eligible_date = null;
        await upcomingState.save();
      }
    } else if (!classification.upcoming.isEligibleByDays) {
      upcomingReason = `Nearest upcoming invoice is ${classification.upcoming.daysUntilNearestDue} days away (lead window is <= 3 days)`;
    } else if (upcomingState && upcomingState.last_sent_at) {
      const lastSentStr = getLocalDateString(upcomingState.last_sent_at, timezone);
      if (targetLocalDateStr === lastSentStr) {
        upcomingCanSend = false;
        upcomingReason = "Upcoming reminder already sent today";
      } else if (
        upcomingState.last_reference_due_date &&
        classification.upcoming.nearestDueDate &&
        getLocalDateString(upcomingState.last_reference_due_date, timezone) ===
          getLocalDateString(classification.upcoming.nearestDueDate, timezone) &&
        upcomingState.next_eligible_date &&
        targetLocalDateStr < getLocalDateString(upcomingState.next_eligible_date, timezone)
      ) {
        upcomingCanSend = false;
        upcomingReason = "Upcoming reminder already sent for this due date cycle";
      } else {
        upcomingCanSend = true;
        upcomingReason = "Eligible for upcoming payment reminder";
      }
    } else {
      upcomingCanSend = true;
      upcomingReason = "Eligible for upcoming payment reminder";
    }

    // Apply Customer Coordination Rule:
    // If BOTH Overdue and Upcoming are eligible, send OVERDUE only, defer UPCOMING.
    let coordinatedAction = "NONE";
    let coordinationReason = "No eligible reminder to send";

    if (overdueCanSend && hasValidPhone) {
      coordinatedAction = "SEND_OVERDUE";
      coordinationReason = upcomingCanSend
        ? "Both overdue and upcoming dues exist. Overdue takes precedence; upcoming reminder deferred."
        : "Overdue reminder eligible.";
    } else if (upcomingCanSend && hasValidPhone) {
      coordinatedAction = "SEND_UPCOMING";
      coordinationReason = "Upcoming reminder eligible.";
    } else if (!hasValidPhone) {
      coordinationReason = "Customer does not have a valid WhatsApp phone number";
    } else {
      coordinationReason = overdueReason || upcomingReason;
    }

    return {
      shop,
      customer,
      timezone,
      targetLocalDateStr,
      cleanPhone,
      hasValidPhone,
      classification,
      overdueState,
      upcomingState,
      overdue: {
        ...classification.overdue,
        canSend: overdueCanSend,
        reason: overdueReason,
      },
      upcoming: {
        ...classification.upcoming,
        canSend: upcomingCanSend,
        reason: upcomingReason,
      },
      coordinatedAction,
      coordinationReason,
    };
  }

  /**
   * Sends a consolidated payment reminder message for a customer.
   * Handles both automated scheduler runs and manual controller dispatches.
   */
  static async sendCustomerPaymentReminder({
    shopId,
    customerId,
    category = null, // "OVERDUE" | "UPCOMING" | null (auto-select via coordination)
    isManual = false,
    force = false,
    targetDate = new Date(),
    recordedBy = null,
  }) {
    const evaluation = await this.evaluateCustomerReminder({
      shopId,
      customerId,
      targetDate,
    });

    const { shop, customer, timezone, targetLocalDateStr, cleanPhone, hasValidPhone } = evaluation;

    if (!hasValidPhone) {
      return {
        success: false,
        message: "Customer does not have a valid WhatsApp phone number",
        evaluation,
      };
    }

    // Determine target category
    let targetCategory = category;
    if (!targetCategory) {
      if (evaluation.coordinatedAction === "SEND_OVERDUE") {
        targetCategory = "OVERDUE";
      } else if (evaluation.coordinatedAction === "SEND_UPCOMING") {
        targetCategory = "UPCOMING";
      } else if (evaluation.overdue.count > 0) {
        targetCategory = "OVERDUE";
      } else if (evaluation.upcoming.count > 0) {
        targetCategory = "UPCOMING";
      } else {
        return {
          success: false,
          message: "No outstanding or upcoming payments found for this customer",
          evaluation,
        };
      }
    }

    // Check eligibility unless forced or manual override
    if (!isManual && !force) {
      if (targetCategory === "OVERDUE" && !evaluation.overdue.canSend) {
        return {
          success: false,
          message: evaluation.overdue.reason,
          evaluation,
        };
      }
      if (targetCategory === "UPCOMING" && !evaluation.upcoming.canSend) {
        return {
          success: false,
          message: evaluation.upcoming.reason,
          evaluation,
        };
      }
    }

    // Prepare template parameters
    const customerDisplayName =
      customer.full_name || customer.first_name || getFirstName(customer, "ग्राहक");
    const shopDisplayName = shop.shop_name_hi || shop.shop_name || "WarrantyDesk";
    const shopContactPhone = formatPhoneNumber(shop.phone) || "";

    let templateName = "";
    let invoiceCount = 0;
    let outstandingAmount = 0;
    let referenceDueDate = null;
    let invoiceIds = [];

    if (targetCategory === "OVERDUE") {
      templateName = "payment_overdue_hi";
      invoiceCount = evaluation.overdue.count;
      outstandingAmount = evaluation.overdue.totalDue;
      referenceDueDate = evaluation.overdue.oldestDueDate;
      invoiceIds = evaluation.overdue.invoices.map((i) => i._id);
    } else {
      templateName = "payment_upcoming_hiindi";
      invoiceCount = evaluation.upcoming.count;
      outstandingAmount = evaluation.upcoming.totalDue;
      referenceDueDate = evaluation.upcoming.nearestDueDate;
      invoiceIds = evaluation.upcoming.invoices.map((i) => i._id);
    }

    if (invoiceCount === 0 || outstandingAmount <= 0) {
      return {
        success: false,
        message: `No ${targetCategory.toLowerCase()} invoices available to remind`,
        evaluation,
      };
    }

    const formattedAmount = formatAmountWithoutCurrency(outstandingAmount);
    const formattedDate = formatDateDMY(referenceDueDate, timezone);

    // Exact Approved Template Variables (6 parameters):
    // {{1}}: Customer name
    // {{2}}: Count of invoices
    // {{3}}: Outstanding amount (without ₹)
    // {{4}}: Due date (DD/MM/YYYY)
    // {{5}}: Shop contact phone
    // {{6}}: Shop display name
    const components = [
      customerDisplayName,
      String(invoiceCount),
      formattedAmount,
      formattedDate,
      shopContactPhone,
      shopDisplayName,
    ];

    // Create ReminderLog entry
    const reminderLog = await ReminderLog.create({
      entity_id: customer._id.toString(),
      entity_type: "CUSTOMER",
      customer_id: customer._id,
      shop_id: shop._id,
      recipient_number: cleanPhone,
      recipient_name: customerDisplayName,
      template_name: templateName,
      reminder_category: targetCategory,
      invoice_count: invoiceCount,
      outstanding_amount: outstandingAmount,
      due_date: referenceDueDate,
      invoice_ids: invoiceIds,
      message_content: `[${targetCategory}] ${customerDisplayName}: ${invoiceCount} bill(s) pending totaling ${formattedAmount}, due date ${formattedDate}`,
      message_status: "PENDING",
    });

    // Send via MSG91
    let sendResult = null;
    try {
      sendResult = await sendWhatsappMessageViaMSG91({
        templateName,
        to: cleanPhone,
        components,
        languageCode: "hi",
        hospitalId: shop._id,
        campaignName: templateName,
        userName: customerDisplayName,
        messageType: `CUSTOMER_${targetCategory}_REMINDER`,
      });
    } catch (msgErr) {
      console.error(`[PaymentReminderService] MSG91 dispatch failed:`, msgErr);
      reminderLog.message_status = "FAILED";
      reminderLog.failure_reason = msgErr.message || "MSG91 dispatch error";
      await reminderLog.save();

      return {
        success: false,
        message: "Failed to dispatch WhatsApp reminder via MSG91",
        error: msgErr.message,
        reminderLogId: reminderLog._id,
      };
    }

    const isSuccess = Boolean(
      sendResult &&
      sendResult.success !== false &&
      (sendResult.success === true ||
        sendResult.status === "success" ||
        sendResult.hasError === false) &&
      sendResult.type !== "error" &&
      sendResult.status !== "error" &&
      !sendResult.isRateLimit
    );

    if (isSuccess) {
      reminderLog.message_status = "SENT";
      reminderLog.sent_at = new Date();
      reminderLog.provider_message_id =
        sendResult.request_id || sendResult.message_id || sendResult.id || null;
      await reminderLog.save();

      // Update CustomerPaymentReminderState
      const nextEligibleDate =
        targetCategory === "OVERDUE"
          ? addCalendarDays(targetDate, 7, timezone) // Next overdue reminder in 7 calendar days
          : addCalendarDays(targetDate, 3, timezone); // Next upcoming cycle check

      await CustomerPaymentReminderState.findOneAndUpdate(
        {
          shop_id: shop._id,
          customer_id: customer._id,
          reminder_category: targetCategory,
          deleted_at: null,
        },
        {
          $set: {
            cycle_status: "ACTIVE",
            last_sent_at: new Date(),
            next_eligible_date: nextEligibleDate,
            last_invoice_count: invoiceCount,
            last_outstanding_amount: outstandingAmount,
            last_reference_due_date: referenceDueDate,
            last_provider_message_id: reminderLog.provider_message_id,
          },
          $setOnInsert: {
            first_eligibility_date: targetDate,
            cycle_id: new mongoose.Types.ObjectId().toString(),
          },
          $inc: {
            total_reminders_sent: 1,
          },
        },
        { upsert: true, new: true }
      );

      return {
        success: true,
        message: `Consolidated ${targetCategory.toLowerCase()} payment reminder sent successfully`,
        data: {
          category: targetCategory,
          templateName,
          invoiceCount,
          outstandingAmount,
          referenceDueDate: formattedDate,
          recipientNumber: cleanPhone,
          reminderLogId: reminderLog._id,
        },
      };
    } else {
      const errMsg =
        sendResult?.message ||
        sendResult?.error ||
        "MSG91 WhatsApp send returned failure";

      reminderLog.message_status = "FAILED";
      reminderLog.failure_reason = errMsg;
      await reminderLog.save();

      return {
        success: false,
        message: errMsg,
        isRateLimit: Boolean(sendResult?.isRateLimit),
        reminderLogId: reminderLog._id,
      };
    }
  }

  /**
   * Process payment reminders for all active shops and their customers.
   * Called by the daily scheduler (9:00 AM IST).
   */
  static async processAllPaymentReminders(targetDate = new Date()) {
    const results = {
      shopsProcessed: 0,
      remindersSent: 0,
      remindersSkipped: 0,
      remindersFailed: 0,
      dailySummariesSent: 0,
      shopSummaries: {},
    };

    // Find all active shops
    const activeShops = await Shop.find({ deleted_at: null }).lean();
    results.shopsProcessed = activeShops.length;

    for (const shop of activeShops) {
      const shopId = shop._id;
      const timezone = shop.timezone || "Asia/Kolkata";
      const shopSummaryEntries = [];

      try {
        // Find distinct customer IDs with unpaid or partially paid active invoices in this shop
        const unpaidInvoices = await Invoice.find({
          shop_id: shopId,
          payment_status: { $in: ["UNPAID", "PARTIAL"] },
          deleted_at: null,
        })
          .select("customer_id")
          .lean();

        const uniqueCustomerIds = [
          ...new Set(
            unpaidInvoices
              .map((inv) => (inv.customer_id ? String(inv.customer_id) : null))
              .filter(Boolean)
          ),
        ];

        for (const custId of uniqueCustomerIds) {
          try {
            const evalResult = await this.evaluateCustomerReminder({
              shopId,
              customerId: custId,
              targetDate,
              shopDoc: shop,
            });

            if (
              evalResult.coordinatedAction === "SEND_OVERDUE" ||
              evalResult.coordinatedAction === "SEND_UPCOMING"
            ) {
              const sendOutcome = await this.sendCustomerPaymentReminder({
                shopId,
                customerId: custId,
                category: evalResult.coordinatedAction === "SEND_OVERDUE" ? "OVERDUE" : "UPCOMING",
                targetDate,
              });

              if (sendOutcome.success) {
                results.remindersSent++;
                const isOverdue = evalResult.coordinatedAction === "SEND_OVERDUE";
                const catData = isOverdue ? evalResult.overdue : evalResult.upcoming;

                shopSummaryEntries.push({
                  customerName: evalResult.customer.full_name || "ग्राहक",
                  customerPhone: evalResult.cleanPhone,
                  invoiceCount: catData.count,
                  amountDue: catData.totalDue,
                  statusLabel: isOverdue ? "अतिदेय" : "आगामी",
                });
              } else {
                results.remindersFailed++;
              }
            } else {
              results.remindersSkipped++;
            }
          } catch (custErr) {
            console.error(
              `[PaymentReminderService] Error evaluating customer ${custId} in shop ${shopId}:`,
              custErr
            );
            results.remindersFailed++;
          }
        }

        // Store entries for shop daily summary
        if (shopSummaryEntries.length > 0) {
          results.shopSummaries[String(shopId)] = shopSummaryEntries;
        }
      } catch (shopErr) {
        console.error(`[PaymentReminderService] Error processing shop ${shopId}:`, shopErr);
      }
    }

    return results;
  }
}

export default PaymentReminderService;

