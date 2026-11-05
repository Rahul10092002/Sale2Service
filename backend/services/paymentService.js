import mongoose from "mongoose";
import PaymentReceipt from "../models/PaymentReceipt.js";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import Shop from "../models/Shop.js";
import { ReceiptSequenceService } from "./receiptSequenceService.js";
import { formatPhoneNumber, isValidWhatsAppNumber, formatDateForMessage } from "../scheduler/core/utils.js";
import { sendWhatsappMessageViaMSG91 } from "../config/msg91.js";

/**
 * Executes a callback within a MongoDB session/transaction if supported,
 * or cleanly falls back to direct execution if running on a standalone instance without replica sets.
 */
async function withTransactionSafe(callback) {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (sessErr) {
    // Standalone MongoDB without replica set does not support transactions
    session = null;
  }

  if (session) {
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } else {
    // Direct atomic sequential execution
    return await callback(null);
  }
}

export class PaymentService {
  /**
   * Universal Payment Recording Engine.
   * Handles:
   *  - Automatic FIFO allocation across oldest unpaid bills
   *  - Manual allocation across selected invoices
   *  - Direct Advance Deposit into customer wallet
   *  - Single Invoice payment with excess auto-distribution
   *  - Idempotency protection to prevent duplicate submissions
   */
  static async recordPayment({
    shopId,
    customerId,
    amount,
    payment_method = "CASH",
    payment_date = new Date(),
    transaction_reference = "",
    notes = "",
    recorded_by,
    idempotency_key,
    allocation_mode = "AUTO_FIFO", // "AUTO_FIFO" | "MANUAL" | "ADVANCE_ONLY" | "SINGLE_INVOICE"
    allocations = [], // [{ invoice_id, amount }]
    target_invoice_id = null,
    send_whatsapp = true,
  }) {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || isNaN(numAmount)) {
      throw new Error("Valid positive payment amount is required");
    }

    const validModes = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "WALLET", "OTHER"];
    const normalizedMethod = String(payment_method || "CASH").toUpperCase();
    const finalMethod = validModes.includes(normalizedMethod) ? normalizedMethod : "CASH";

    // 1. Idempotency Check: return existing receipt if duplicate request received
    if (idempotency_key && String(idempotency_key).trim()) {
      const cleanKey = String(idempotency_key).trim();
      const existingReceipt = await PaymentReceipt.findOne({
        shop_id: shopId,
        idempotency_key: cleanKey,
        deleted_at: null,
      }).populate("recorded_by", "first_name last_name");

      if (existingReceipt) {
        return {
          receipt: existingReceipt,
          isDuplicate: true,
          message: `Payment already processed with receipt #${existingReceipt.receipt_number}`,
        };
      }
    }

    const payDate = payment_date ? new Date(payment_date) : new Date();

    return await withTransactionSafe(async (session) => {
      // 2. Fetch Customer and Shop (scoped by shop_id)
      const customer = await Customer.findOne({
        _id: customerId,
        shop_id: shopId,
        deleted_at: null,
      }).session(session);

      if (!customer) {
        throw new Error("Customer not found or unauthorized");
      }

      const shop = await Shop.findById(shopId).session(session);
      if (!shop) {
        throw new Error("Shop not found");
      }

      let remainingPayment = numAmount;
      const receiptAllocations = [];
      const updatedInvoices = [];

      // 3. Allocation Strategy
      if (allocation_mode === "ADVANCE_ONLY") {
        // Direct advance wallet deposit
        // No invoices touched
      } else if (allocation_mode === "MANUAL" && Array.isArray(allocations) && allocations.length > 0) {
        // User manually selected invoices and amounts
        for (const item of allocations) {
          if (remainingPayment <= 0) break;
          const allocAmt = Number(item.amount);
          if (!allocAmt || allocAmt <= 0) continue;

          const inv = await Invoice.findOne({
            _id: item.invoice_id,
            customer_id: customerId,
            shop_id: shopId,
            deleted_at: null,
          }).session(session);

          if (!inv) continue;

          const currentPaid = Number(inv.amount_paid || 0);
          const currentCredit = Number(inv.excess_exchange_credit || 0);
          const netDue = Math.max(0, Number(inv.total_amount || 0) - (currentPaid + currentCredit));
          const appliedAmt = Math.min(allocAmt, netDue, remainingPayment);

          if (appliedAmt <= 0) continue;

          const newPaid = currentPaid + appliedAmt;
          const newDue = Math.max(0, Number(inv.total_amount || 0) - (newPaid + currentCredit));
          const newStatus = newDue === 0 ? "PAID" : "PARTIAL";

          inv.amount_paid = newPaid;
          inv.amount_due = newDue;
          inv.payment_status = newStatus;
          inv.payment_mode = finalMethod;

          inv.payments = inv.payments || [];
          inv.payments.push({
            amount: appliedAmt,
            payment_method: finalMethod,
            payment_date: payDate,
            notes: notes || `Manual payment allocation (${finalMethod})`,
            recorded_by,
          });

          await inv.save({ session });

          receiptAllocations.push({
            invoice_id: inv._id,
            invoice_number: inv.invoice_number,
            amount: appliedAmt,
            allocation_date: payDate,
          });

          updatedInvoices.push({
            invoice_id: inv._id,
            invoice_number: inv.invoice_number,
            amount_applied: appliedAmt,
            remaining_due: newDue,
            status: newStatus,
          });

          remainingPayment -= appliedAmt;
        }
      } else if (allocation_mode === "SINGLE_INVOICE" && target_invoice_id) {
        // Single invoice payment
        const targetInv = await Invoice.findOne({
          _id: target_invoice_id,
          customer_id: customerId,
          shop_id: shopId,
          deleted_at: null,
        }).session(session);

        if (!targetInv) {
          throw new Error("Target invoice not found");
        }

        const tPaid = Number(targetInv.amount_paid || 0);
        const tCredit = Number(targetInv.excess_exchange_credit || 0);
        const tNetDue = Math.max(0, Number(targetInv.total_amount || 0) - (tPaid + tCredit));
        const appliedToTarget = Math.min(remainingPayment, tNetDue);

        if (appliedToTarget > 0) {
          const newPaid = tPaid + appliedToTarget;
          const newDue = Math.max(0, Number(targetInv.total_amount || 0) - (newPaid + tCredit));
          const newStatus = newDue === 0 ? "PAID" : "PARTIAL";

          targetInv.amount_paid = newPaid;
          targetInv.amount_due = newDue;
          targetInv.payment_status = newStatus;
          targetInv.payment_mode = finalMethod;

          targetInv.payments = targetInv.payments || [];
          targetInv.payments.push({
            amount: appliedToTarget,
            payment_method: finalMethod,
            payment_date: payDate,
            notes: notes || `Payment recorded on invoice (${finalMethod})`,
            recorded_by,
          });

          await targetInv.save({ session });

          receiptAllocations.push({
            invoice_id: targetInv._id,
            invoice_number: targetInv.invoice_number,
            amount: appliedToTarget,
            allocation_date: payDate,
          });

          updatedInvoices.push({
            invoice_id: targetInv._id,
            invoice_number: targetInv.invoice_number,
            amount_applied: appliedToTarget,
            remaining_due: newDue,
            status: newStatus,
          });

          remainingPayment -= appliedToTarget;
        }

        // If excess remains, auto-allocate to other unpaid invoices (FIFO)
        if (remainingPayment > 0) {
          const otherInvoices = await Invoice.find({
            customer_id: customerId,
            shop_id: shopId,
            deleted_at: null,
            _id: { $ne: targetInv._id },
            payment_status: { $in: ["UNPAID", "PARTIAL"] },
          })
            .sort({ invoice_date: 1, createdAt: 1 })
            .session(session);

          for (const otherInv of otherInvoices) {
            if (remainingPayment <= 0) break;

            const oPaid = Number(otherInv.amount_paid || 0);
            const oCredit = Number(otherInv.excess_exchange_credit || 0);
            const oNetDue = Math.max(0, Number(otherInv.total_amount || 0) - (oPaid + oCredit));
            if (oNetDue <= 0) continue;

            const appliedAmt = Math.min(remainingPayment, oNetDue);
            const oNewPaid = oPaid + appliedAmt;
            const oNewDue = Math.max(0, Number(otherInv.total_amount || 0) - (oNewPaid + oCredit));
            const oNewStatus = oNewDue === 0 ? "PAID" : "PARTIAL";

            otherInv.amount_paid = oNewPaid;
            otherInv.amount_due = oNewDue;
            otherInv.payment_status = oNewStatus;
            otherInv.payment_mode = finalMethod;

            otherInv.payments = otherInv.payments || [];
            otherInv.payments.push({
              amount: appliedAmt,
              payment_method: finalMethod,
              payment_date: payDate,
              notes: notes || `Excess auto-allocated from ${targetInv.invoice_number}`,
              recorded_by,
            });

            await otherInv.save({ session });

            receiptAllocations.push({
              invoice_id: otherInv._id,
              invoice_number: otherInv.invoice_number,
              amount: appliedAmt,
              allocation_date: payDate,
            });

            updatedInvoices.push({
              invoice_id: otherInv._id,
              invoice_number: otherInv.invoice_number,
              amount_applied: appliedAmt,
              remaining_due: oNewDue,
              status: oNewStatus,
            });

            remainingPayment -= appliedAmt;
          }
        }
      } else {
        // Default: AUTO_FIFO across all unpaid invoices (oldest first)
        const unpaidInvoices = await Invoice.find({
          customer_id: customerId,
          shop_id: shopId,
          deleted_at: null,
          payment_status: { $in: ["UNPAID", "PARTIAL"] },
        })
          .sort({ invoice_date: 1, createdAt: 1 })
          .session(session);

        for (const inv of unpaidInvoices) {
          if (remainingPayment <= 0) break;

          const currentPaid = Number(inv.amount_paid || 0);
          const currentCredit = Number(inv.excess_exchange_credit || 0);
          const netDue = Math.max(0, Number(inv.total_amount || 0) - (currentPaid + currentCredit));
          if (netDue <= 0) continue;

          const appliedAmt = Math.min(remainingPayment, netDue);
          const newPaid = currentPaid + appliedAmt;
          const newDue = Math.max(0, Number(inv.total_amount || 0) - (newPaid + currentCredit));
          const newStatus = newDue === 0 ? "PAID" : "PARTIAL";

          inv.amount_paid = newPaid;
          inv.amount_due = newDue;
          inv.payment_status = newStatus;
          inv.payment_mode = finalMethod;

          inv.payments = inv.payments || [];
          inv.payments.push({
            amount: appliedAmt,
            payment_method: finalMethod,
            payment_date: payDate,
            notes: notes || "Lump sum customer ledger payment",
            recorded_by,
          });

          await inv.save({ session });

          receiptAllocations.push({
            invoice_id: inv._id,
            invoice_number: inv.invoice_number,
            amount: appliedAmt,
            allocation_date: payDate,
          });

          updatedInvoices.push({
            invoice_id: inv._id,
            invoice_number: inv.invoice_number,
            amount_applied: appliedAmt,
            remaining_due: newDue,
            status: newStatus,
          });

          remainingPayment -= appliedAmt;
        }
      }

      // 4. Excess Credit or Direct Advance Deposit
      let advanceCredited = 0;
      if (remainingPayment > 0) {
        advanceCredited = remainingPayment;
        customer.advance_balance = Number(customer.advance_balance || 0) + advanceCredited;
        customer.advance_history = customer.advance_history || [];
        customer.advance_history.push({
          amount: advanceCredited,
          type: "CREDIT",
          payment_method: finalMethod,
          payment_date: payDate,
          notes: notes || (allocation_mode === "ADVANCE_ONLY" ? "Direct customer advance deposit" : "Excess payment credited to advance wallet"),
          recorded_by,
        });
        await customer.save({ session });
      }

      // 5. Generate Collision-Proof Sequential Receipt Number
      const receiptNumber = await ReceiptSequenceService.generateAuthoritativeReceiptNumber(
        shopId,
        payDate,
        session
      );

      // 6. Create First-Class PaymentReceipt Record
      const receipt = new PaymentReceipt({
        shop_id: shopId,
        customer_id: customerId,
        receipt_number: receiptNumber,
        amount: numAmount,
        payment_method: finalMethod,
        payment_date: payDate,
        transaction_reference: String(transaction_reference || "").trim(),
        status: "COMPLETED",
        allocations: receiptAllocations,
        advance_amount_credited: advanceCredited,
        idempotency_key: idempotency_key ? String(idempotency_key).trim() : undefined,
        notes: String(notes || "").trim(),
        recorded_by,
      });

      await receipt.save({ session });

      // 7. Non-Fatal Outbound WhatsApp Receipt Notification
      if (send_whatsapp && customer.whatsapp_number) {
        const cleanPhone = formatPhoneNumber(customer.whatsapp_number);
        if (cleanPhone && isValidWhatsAppNumber(cleanPhone)) {
          try {
            const templateVars = {
              1: numAmount.toFixed(2),
              2: receiptNumber,
              3: formatDateForMessage(payDate),
              4: shop.shop_name_hi || shop.shop_name || "",
            };

            sendWhatsappMessageViaMSG91({
              templateName: "payment_received",
              to: cleanPhone,
              components: templateVars,
              campaignName: "payment_received",
              hospitalId: shop._id,
              userName: customer.full_name || "",
              messageType: "payment_received",
            }).catch((err) => {
              console.error(`WhatsApp notification failed for receipt ${receiptNumber}:`, err?.message);
            });
          } catch (waErr) {
            console.error("WhatsApp formatting error (non-fatal):", waErr);
          }
        }
      }

      return {
        receipt,
        customer: {
          _id: customer._id,
          full_name: customer.full_name,
          advance_balance: customer.advance_balance,
        },
        updated_invoices: updatedInvoices,
        advance_credited: advanceCredited,
        message: `Payment of ₹${numAmount.toLocaleString("en-IN")} recorded successfully (Receipt #${receiptNumber})`,
      };
    });
  }

  /**
   * Controlled Reversal of a Payment Receipt
   * Restores invoice dues and debits customer advance wallet.
   */
  static async reversePayment({
    shopId,
    receiptId,
    userId,
    reason,
  }) {
    if (!reason || !String(reason).trim()) {
      throw new Error("A clear reversal reason is mandatory");
    }

    return await withTransactionSafe(async (session) => {
      const receipt = await PaymentReceipt.findOne({
        _id: receiptId,
        shop_id: shopId,
        deleted_at: null,
      }).session(session);

      if (!receipt) {
        throw new Error("Payment receipt not found");
      }

      if (receipt.status === "REVERSED") {
        throw new Error("This payment receipt has already been reversed");
      }

      // 1. Reverse Invoice Allocations
      for (const alloc of receipt.allocations) {
        const inv = await Invoice.findOne({
          _id: alloc.invoice_id,
          shop_id: shopId,
          deleted_at: null,
        }).session(session);

        if (inv) {
          const allocAmount = Number(alloc.amount || 0);
          const currentPaid = Number(inv.amount_paid || 0);
          const currentCredit = Number(inv.excess_exchange_credit || 0);

          const restoredPaid = Math.max(0, currentPaid - allocAmount);
          const restoredDue = Math.max(0, Number(inv.total_amount || 0) - (restoredPaid + currentCredit));
          const restoredStatus = restoredDue === 0 ? "PAID" : restoredPaid > 0 ? "PARTIAL" : "UNPAID";

          inv.amount_paid = restoredPaid;
          inv.amount_due = restoredDue;
          inv.payment_status = restoredStatus;

          inv.payments = inv.payments || [];
          inv.payments.push({
            amount: -allocAmount,
            payment_method: receipt.payment_method,
            payment_date: new Date(),
            notes: `REVERSAL: ${reason} (Receipt #${receipt.receipt_number})`,
            recorded_by: userId,
          });

          await inv.save({ session });
        }
      }

      // 2. Reverse Advance Wallet Credit
      if (receipt.advance_amount_credited > 0) {
        const customer = await Customer.findOne({
          _id: receipt.customer_id,
          shop_id: shopId,
          deleted_at: null,
        }).session(session);

        if (customer) {
          const revAdvance = Number(receipt.advance_amount_credited);
          customer.advance_balance = Math.max(0, Number(customer.advance_balance || 0) - revAdvance);
          customer.advance_history = customer.advance_history || [];
          customer.advance_history.push({
            amount: revAdvance,
            type: "DEBIT",
            payment_method: receipt.payment_method,
            payment_date: new Date(),
            notes: `REVERSAL: ${reason} (Receipt #${receipt.receipt_number})`,
            recorded_by: userId,
          });
          await customer.save({ session });
        }
      }

      // 3. Mark Receipt as REVERSED
      receipt.status = "REVERSED";
      receipt.reversal_reason = String(reason).trim();
      receipt.reversed_at = new Date();
      receipt.reversed_by = userId;

      await receipt.save({ session });

      return {
        receipt,
        message: `Receipt #${receipt.receipt_number} reversed successfully`,
      };
    });
  }

  /**
   * Fetches payment history for a specific invoice, merging first-class receipts
   * and legacy invoice.payments records for 100% backward compatibility.
   */
  static async getInvoicePayments(shopId, invoiceId) {
    const receipts = await PaymentReceipt.find({
      shop_id: shopId,
      "allocations.invoice_id": invoiceId,
      deleted_at: null,
    })
      .populate("recorded_by", "first_name last_name email")
      .populate("reversed_by", "first_name last_name email")
      .sort({ payment_date: -1, createdAt: -1 })
      .lean();

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      shop_id: shopId,
      deleted_at: null,
    }).lean();

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Build unified payments list
    const mappedReceiptPayments = receipts.map((r) => {
      const thisAlloc = r.allocations.find(
        (a) => String(a.invoice_id) === String(invoiceId)
      );
      return {
        _id: r._id,
        receipt_id: r._id,
        receipt_number: r.receipt_number,
        payment_date: r.payment_date,
        amount_allocated: thisAlloc ? thisAlloc.amount : r.amount,
        total_receipt_amount: r.amount,
        payment_method: r.payment_method,
        transaction_reference: r.transaction_reference,
        status: r.status,
        notes: r.notes,
        recorded_by: r.recorded_by,
        is_first_class: true,
        reversal_reason: r.reversal_reason,
        reversed_at: r.reversed_at,
      };
    });

    // Also include any legacy payments inside invoice.payments if no receipt exists
    const existingReceiptNumbers = new Set(receipts.map((r) => r.receipt_number));
    const legacyPayments = (invoice.payments || [])
      .filter((p) => {
        // If payment has no receipt or notes doesn't contain matching receipt
        return !Array.from(existingReceiptNumbers).some(
          (rn) => p.notes && p.notes.includes(rn)
        );
      })
      .map((p, idx) => ({
        _id: p._id || `legacy_${invoice._id}_${idx}`,
        receipt_number: `LEGACY-${idx + 1}`,
        payment_date: p.payment_date || invoice.invoice_date,
        amount_allocated: p.amount,
        total_receipt_amount: p.amount,
        payment_method: p.payment_method || invoice.payment_mode || "CASH",
        transaction_reference: "",
        status: "COMPLETED",
        notes: p.notes || "Legacy invoice payment",
        recorded_by: p.recorded_by,
        is_first_class: false,
      }));

    // Merge and sort
    const allPayments = [...mappedReceiptPayments, ...legacyPayments].sort(
      (a, b) => new Date(b.payment_date) - new Date(a.payment_date)
    );

    return {
      invoice_id: invoice._id,
      invoice_number: invoice.invoice_number,
      total_amount: invoice.total_amount,
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      payment_status: invoice.payment_status,
      payments: allPayments,
    };
  }

  /**
   * Fetches all payment receipts for a customer
   */
  static async getCustomerReceipts(shopId, customerId) {
    const receipts = await PaymentReceipt.find({
      shop_id: shopId,
      customer_id: customerId,
      deleted_at: null,
    })
      .populate("recorded_by", "first_name last_name email")
      .populate("reversed_by", "first_name last_name email")
      .sort({ payment_date: -1, createdAt: -1 })
      .lean();

    return receipts;
  }
}

