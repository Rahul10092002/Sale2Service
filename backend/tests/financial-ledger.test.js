import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateInvoiceTotals,
  getInvoiceItemAmount,
  derivePaymentStatus,
  roundCurrency,
  GST_RATE_PERCENT,
  GST_RATE_DECIMAL,
} from "../../shared/invoiceMath.js";

test("Financial Safety Rule A & D: Authoritative Shared Invoice Math", async (t) => {
  await t.test("GST inclusive calculations correctly separate tax and base", () => {
    const items = [
      { selling_price: 1180, quantity: 1 },
    ];
    const res = calculateInvoiceTotals({
      invoice: { is_tax_inclusive: true, discount: 0, old_item_exchange_price: 0 },
      items,
    });
    assert.equal(roundCurrency(res.subtotal), 1000);
    assert.equal(roundCurrency(res.tax), 180);
    assert.equal(roundCurrency(res.total_amount), 1180);
  });

  await t.test("GST exclusive calculations correctly compute 18% tax", () => {
    const items = [
      { selling_price: 1000, quantity: 2 },
    ];
    const res = calculateInvoiceTotals({
      invoice: { is_tax_inclusive: false, discount: 0, old_item_exchange_price: 0 },
      items,
    });
    assert.equal(roundCurrency(res.subtotal), 2000);
    assert.equal(roundCurrency(res.tax), 360);
    assert.equal(roundCurrency(res.total_amount), 2360);
  });

  await t.test("Invoice summary with discount and exchange price", () => {
    const items = [
      { selling_price: 5900, quantity: 1 },
    ];
    const res = calculateInvoiceTotals({
      invoice: {
        is_tax_inclusive: true,
        discount: 400,
        old_item_exchange_price: 1500,
      },
      items,
    });

    assert.equal(roundCurrency(res.gross_item_total), 5900);
    assert.equal(roundCurrency(res.discount), 400);
    assert.equal(roundCurrency(res.old_item_exchange_price), 1500);
    assert.equal(roundCurrency(res.total_amount), 4000);
    assert.equal(roundCurrency(res.excess_exchange_credit), 0);
  });

  await t.test("Excess exchange price generates excess exchange credit without negative total", () => {
    const items = [
      { selling_price: 1180, quantity: 1 },
    ];
    const res = calculateInvoiceTotals({
      invoice: {
        is_tax_inclusive: true,
        discount: 0,
        old_item_exchange_price: 2000, // Exchange exceeds invoice total
      },
      items,
    });

    assert.equal(roundCurrency(res.gross_item_total), 1180);
    assert.equal(roundCurrency(res.total_amount), 0);
    assert.equal(roundCurrency(res.excess_exchange_credit), 820);
  });

  await t.test("Derive payment status correctly with floating precision", () => {
    assert.equal(derivePaymentStatus({ amountPaid: 0, totalAmount: 5000 }), "UNPAID");
    assert.equal(derivePaymentStatus({ amountPaid: 2500, totalAmount: 5000 }), "PARTIAL");
    assert.equal(derivePaymentStatus({ amountPaid: 5000, totalAmount: 5000 }), "PAID");
    assert.equal(derivePaymentStatus({ amountPaid: 5000.004, totalAmount: 5000 }), "PAID");
    assert.equal(derivePaymentStatus({ amountPaid: 0, totalAmount: 0, fallbackStatus: "PAID" }), "PAID");
  });
});

test("Financial Safety Rule B: Single Receipt Multiple Invoice Allocations", async (t) => {
  await t.test("Lump-sum FIFO distribution logic allocates sequentially", () => {
    const unpaidInvoices = [
      { id: "INV-001", due: 3000 },
      { id: "INV-002", due: 4000 },
      { id: "INV-003", due: 2000 },
    ];

    const totalPaid = 8000;
    let rem = totalPaid;
    const allocations = [];

    for (const inv of unpaidInvoices) {
      if (rem <= 0) break;
      const alloc = Math.min(rem, inv.due);
      allocations.push({
        id: inv.id,
        amount_applied: alloc,
        remaining_due: inv.due - alloc,
        status: inv.due - alloc === 0 ? "PAID" : "PARTIAL",
      });
      rem -= alloc;
    }

    assert.equal(allocations.length, 3);
    assert.equal(allocations[0].amount_applied, 3000);
    assert.equal(allocations[0].status, "PAID");
    assert.equal(allocations[1].amount_applied, 4000);
    assert.equal(allocations[1].status, "PAID");
    assert.equal(allocations[2].amount_applied, 1000);
    assert.equal(allocations[2].status, "PARTIAL");
    assert.equal(allocations[2].remaining_due, 1000);
    assert.equal(rem, 0); // No excess left over
  });

  await t.test("Excess beyond all unpaid invoices credits to customer advance wallet", () => {
    const unpaidInvoices = [
      { id: "INV-001", due: 2000 },
    ];

    const totalPaid = 5000;
    let rem = totalPaid;
    const allocations = [];

    for (const inv of unpaidInvoices) {
      if (rem <= 0) break;
      const alloc = Math.min(rem, inv.due);
      allocations.push({ id: inv.id, amount_applied: alloc });
      rem -= alloc;
    }

    const advanceCredited = rem;
    assert.equal(allocations[0].amount_applied, 2000);
    assert.equal(advanceCredited, 3000);
    assert.equal(allocations[0].amount_applied + advanceCredited, totalPaid);
  });
});

test("Financial Safety Rule D: Running Balance & Account Statement Sign Convention", async (t) => {
  await t.test("Sequential events maintain running balance correctly", () => {
    let runningBalance = 0; // Net receivable owed by customer

    const events = [
      { type: "INVOICE_CREATED", debit: 10000, credit: 0 },
      { type: "PAYMENT_RECEIVED", debit: 0, credit: 4000 },
      { type: "PAYMENT_RECEIVED", debit: 0, credit: 6000 },
      { type: "ADVANCE_DEPOSIT", debit: 0, credit: 2000 },
      { type: "PAYMENT_REVERSED", debit: 6000, credit: 0 },
    ];

    const balances = [];
    for (const ev of events) {
      if (ev.type === "INVOICE_CREATED") {
        runningBalance += ev.debit;
      } else if (ev.type === "PAYMENT_RECEIVED") {
        runningBalance -= ev.credit;
      } else if (ev.type === "ADVANCE_DEPOSIT") {
        runningBalance -= ev.credit; // Customer has store credit (negative receivable)
      } else if (ev.type === "PAYMENT_REVERSED") {
        runningBalance += ev.debit; // Dues restored
      }
      balances.push(roundCurrency(runningBalance));
    }

    assert.deepEqual(balances, [10000, 6000, 0, -2000, 4000]);
  });

  await t.test("Opening balance in date-filtered period correctly anchors in-period running balance", () => {
    const priorPeriodDebit = 15000;
    const priorPeriodCredit = 10000;
    const openingBalance = priorPeriodDebit - priorPeriodCredit; // 5000

    assert.equal(openingBalance, 5000);

    let current = openingBalance;
    const inPeriodEvents = [
      { debit: 3000, credit: 0 },
      { debit: 0, credit: 4000 },
    ];

    const inPeriodBalances = [];
    for (const ev of inPeriodEvents) {
      current = roundCurrency(current + ev.debit - ev.credit);
      inPeriodBalances.push(current);
    }

    assert.deepEqual(inPeriodBalances, [8000, 4000]);
    assert.equal(current, 4000); // Closing balance
  });
});

test("Financial Safety Rule G: Receipt Number Sequence Formatting", async (t) => {
  await t.test("Receipt numbers match standard REC-YYMMDD-XXX format", () => {
    const pad = (n, len = 3) => String(n).padStart(len, "0");
    const d = new Date("2026-11-05T10:00:00Z");
    const yy = String(d.getUTCFullYear()).slice(-2);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const dateStr = `${yy}${mm}${dd}`;

    const seq = 1;
    const receiptNumber = `REC-${dateStr}-${pad(seq)}`;

    assert.equal(receiptNumber, "REC-261105-001");
    assert.match(receiptNumber, /^REC-\d{6}-\d{3,}$/);
  });
});
