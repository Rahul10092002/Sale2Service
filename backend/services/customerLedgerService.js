import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";
import PaymentReceipt from "../models/PaymentReceipt.js";

/**
 * Service for generating unified, chronological customer financial ledgers,
 * account statements, and real-time reconciliation balances.
 */
export class CustomerLedgerService {
  /**
   * Generates a comprehensive, double-entry aligned chronological financial ledger.
   */
  static async getCustomerLedger({
    shopId,
    customerId,
    startDate = null,
    endDate = null,
    status = "ALL", // "ALL" | "PAID" | "PARTIAL" | "UNPAID"
    type = "ALL", // "ALL" | "INVOICE" | "PAYMENT" | "ADVANCE"
  }) {
    // 1. Fetch Customer
    const customer = await Customer.findOne({
      _id: customerId,
      shop_id: shopId,
      deleted_at: null,
    }).lean();

    if (!customer) {
      throw new Error("Customer not found");
    }

    // 2. Fetch all Invoices for this customer (without date filtering initially so opening balances are exact)
    const invoiceQuery = {
      customer_id: customerId,
      shop_id: shopId,
      deleted_at: null,
    };
    if (status && status !== "ALL") {
      invoiceQuery.payment_status = status.toUpperCase();
    }

    const invoices = await Invoice.find(invoiceQuery)
      .sort({ invoice_date: 1, createdAt: 1 })
      .lean();

    // 3. Fetch all Payment Receipts for this customer
    const receipts = await PaymentReceipt.find({
      customer_id: customerId,
      shop_id: shopId,
      deleted_at: null,
    })
      .populate("recorded_by", "first_name last_name email")
      .populate("reversed_by", "first_name last_name email")
      .sort({ payment_date: 1, createdAt: 1 })
      .lean();

    // 4. Synthesize Unified Event Stream
    const events = [];
    const recordedReceiptNumbers = new Set(receipts.map((r) => r.receipt_number));

    // A. Add Invoices as DEBIT events
    for (const inv of invoices) {
      let itemsSummary = "";
      if (Array.isArray(inv.services) && inv.services.length > 0) {
        itemsSummary = inv.services.map((s) => s.product_name).filter(Boolean).join(", ");
      } else {
        itemsSummary = "Standard Invoice";
      }

      const totalAmount = Number(inv.total_amount || 0);
      const excessCredit = Number(inv.excess_exchange_credit || 0);

      events.push({
        _id: `inv_${inv._id}`,
        entity_id: inv._id,
        event_type: "INVOICE_CREATED",
        category: "INVOICE",
        effective_date: new Date(inv.invoice_date || inv.createdAt),
        reference_number: inv.invoice_number,
        description: itemsSummary,
        debit: totalAmount,
        credit: 0,
        excess_exchange_credit: excessCredit,
        payment_status: inv.payment_status || "UNPAID",
        payment_mode: inv.payment_mode || "CASH",
        due_date: inv.due_date || null,
        meta: {
          total_amount: totalAmount,
          amount_paid: Number(inv.amount_paid || 0),
          amount_due: Number(inv.amount_due || 0),
        },
        createdAt: inv.createdAt,
      });

      // B. If legacy invoice has payments inside inv.payments NOT tracked by PaymentReceipt:
      if (Array.isArray(inv.payments) && inv.payments.length > 0) {
        for (let i = 0; i < inv.payments.length; i++) {
          const p = inv.payments[i];
          const hasLinkedReceipt = Array.from(recordedReceiptNumbers).some(
            (rn) => p.notes && p.notes.includes(rn)
          );

          if (!hasLinkedReceipt) {
            events.push({
              _id: `leg_pay_${inv._id}_${i}`,
              entity_id: inv._id,
              event_type: "PAYMENT_RECEIVED",
              category: "PAYMENT",
              effective_date: new Date(p.payment_date || inv.invoice_date || inv.createdAt),
              reference_number: `LEGACY-${inv.invoice_number}`,
              description: `Payment on ${inv.invoice_number} via ${p.payment_method || "CASH"}`,
              debit: 0,
              credit: Number(p.amount || 0),
              excess_exchange_credit: 0,
              payment_status: "COMPLETED",
              payment_mode: p.payment_method || "CASH",
              meta: {
                invoice_id: inv._id,
                invoice_number: inv.invoice_number,
                notes: p.notes || "Legacy payment",
                is_legacy: true,
              },
              createdAt: p.payment_date || inv.createdAt,
            });
          }
        }
      }
    }

    // C. Add First-Class Payment Receipts as CREDIT events
    for (const r of receipts) {
      if (r.status === "COMPLETED") {
        let allocDesc = "";
        if (Array.isArray(r.allocations) && r.allocations.length > 0) {
          allocDesc = `Applied to ${r.allocations.map((a) => a.invoice_number).join(", ")}`;
        }
        if (r.advance_amount_credited > 0) {
          allocDesc += (allocDesc ? " | " : "") + `₹${r.advance_amount_credited} to Advance Wallet`;
        }

        events.push({
          _id: `rec_${r._id}`,
          entity_id: r._id,
          event_type: "PAYMENT_RECEIVED",
          category: "PAYMENT",
          effective_date: new Date(r.payment_date || r.createdAt),
          reference_number: r.receipt_number,
          description: `Payment via ${r.payment_method}${r.transaction_reference ? ` [Ref: ${r.transaction_reference}]` : ""}${allocDesc ? ` (${allocDesc})` : ""}`,
          debit: 0,
          credit: Number(r.amount || 0),
          excess_exchange_credit: 0,
          payment_status: "COMPLETED",
          payment_mode: r.payment_method || "CASH",
          recorded_by: r.recorded_by,
          meta: {
            receipt_id: r._id,
            receipt_number: r.receipt_number,
            transaction_reference: r.transaction_reference,
            allocations: r.allocations,
            advance_amount_credited: r.advance_amount_credited,
            notes: r.notes,
          },
          createdAt: r.createdAt,
        });
      } else if (r.status === "REVERSED") {
        // Show both original payment and its reversal entry
        events.push({
          _id: `rec_${r._id}_void`,
          entity_id: r._id,
          event_type: "PAYMENT_REVERSED",
          category: "PAYMENT",
          effective_date: new Date(r.reversed_at || r.updatedAt),
          reference_number: r.receipt_number,
          description: `Reversal of Receipt #${r.receipt_number}: ${r.reversal_reason || "Payment Cancelled"}`,
          debit: Number(r.amount || 0),
          credit: 0,
          excess_exchange_credit: 0,
          payment_status: "REVERSED",
          payment_mode: r.payment_method || "CASH",
          recorded_by: r.reversed_by || r.recorded_by,
          meta: {
            receipt_id: r._id,
            receipt_number: r.receipt_number,
            reversal_reason: r.reversal_reason,
            reversed_at: r.reversed_at,
          },
          createdAt: r.reversed_at || r.updatedAt,
        });
      }
    }

    // D. Chronological Sort:
    // Oldest date first. If identical dates: Invoices before Payments so running balances reflect charge then payment.
    events.sort((a, b) => {
      const timeDiff = a.effective_date.getTime() - b.effective_date.getTime();
      if (timeDiff !== 0) return timeDiff;
      if (a.category === "INVOICE" && b.category !== "INVOICE") return -1;
      if (a.category !== "INVOICE" && b.category === "INVOICE") return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // 5. Compute Sequential Running Balance Across All Historical Events
    let runningBalance = 0;
    for (const ev of events) {
      runningBalance += (ev.debit - ev.credit);
      ev.running_balance = runningBalance;
    }

    // 6. Handle Date Range Filtering & Opening Balance
    const startObj = startDate ? new Date(startDate) : null;
    const endObj = endDate ? new Date(endDate) : null;
    if (endObj) {
      endObj.setHours(23, 59, 59, 999);
    }

    let openingBalance = 0;
    const filteredEvents = [];

    for (const ev of events) {
      const evTime = ev.effective_date.getTime();

      if (startObj && evTime < startObj.getTime()) {
        openingBalance += (ev.debit - ev.credit);
        continue;
      }

      if (endObj && evTime > endObj.getTime()) {
        continue;
      }

      // Filter by Category Type if specified
      if (type && type !== "ALL") {
        if (type === "INVOICE" && ev.category !== "INVOICE") continue;
        if (type === "PAYMENT" && ev.category !== "PAYMENT") continue;
        if (type === "ADVANCE" && ev.category !== "ADVANCE") continue;
      }

      filteredEvents.push(ev);
    }

    // 7. Calculate High-Level KPI Summary Metrics
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let overdueAmount = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    const now = new Date();

    for (const inv of invoices) {
      const t = Number(inv.total_amount || 0);
      const p = Number(inv.amount_paid || 0);
      const d = Number(inv.amount_due || 0);

      totalInvoiced += t;
      totalPaid += p;
      totalDue += d;

      if (inv.payment_status === "PAID") paidCount++;
      else if (inv.payment_status === "PARTIAL") partialCount++;
      else unpaidCount++;

      if (d > 0 && inv.due_date && new Date(inv.due_date) < now) {
        overdueAmount += d;
      }
    }

    const advanceBalance = Number(customer.advance_balance || 0);
    const netReceivable = Math.max(0, totalDue - advanceBalance);
    const storeCreditBalance = totalDue < advanceBalance ? advanceBalance - totalDue : (totalDue === 0 ? advanceBalance : 0);

    // Most recent payment info
    const lastReceipt = receipts.filter((r) => r.status === "COMPLETED").pop();

    return {
      customer: {
        _id: customer._id,
        full_name: customer.full_name,
        whatsapp_number: customer.whatsapp_number,
        alternate_phone: customer.alternate_phone,
        email: customer.email,
        gst_number: customer.gst_number,
        customer_type: customer.customer_type,
        address: customer.address,
        advance_balance: advanceBalance,
        advance_history: customer.advance_history || [],
      },
      summary: {
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        total_due: totalDue,
        overdue_amount: overdueAmount,
        advance_balance: advanceBalance,
        net_receivable: netReceivable,
        store_credit_balance: storeCreditBalance,
        total_invoices: invoices.length,
        paid_count: paidCount,
        partial_count: partialCount,
        unpaid_count: unpaidCount,
        last_payment_amount: lastReceipt ? lastReceipt.amount : (totalPaid > 0 ? totalPaid : 0),
        last_payment_date: lastReceipt ? lastReceipt.payment_date : null,
      },
      statement: {
        opening_balance: openingBalance,
        closing_balance: runningBalance,
        total_period_debits: filteredEvents.reduce((s, e) => s + e.debit, 0),
        total_period_credits: filteredEvents.reduce((s, e) => s + e.credit, 0),
        entries: filteredEvents,
      },
    };
  }
}

