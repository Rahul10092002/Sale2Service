import test from "node:test";
import assert from "node:assert/strict";
import { emiDueDate, upcomingEmis, validateEmi, normalizeEmi } from "../../shared/emiSchedule.js";
import { calculateInvoiceTotals } from "../../shared/invoiceMath.js";
import EmiReminderScheduler from "../scheduler/reminders/EmiReminderScheduler.js";
import EmiReminderDelivery from "../models/EmiReminderDelivery.js";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import InvoiceItem from "../models/InvoiceItem.js";
import Shop from "../models/Shop.js";
import InvoiceCounter from "../models/InvoiceCounter.js";
import { InvoiceSequenceService } from "../services/invoiceSequenceService.js";

const emi = { amount: 2500, installments: 3, first_due_date: "2026-01-31", reminder_days_before: 3, enabled: true };

test("monthly dates clamp without drifting, including leap years and year rollover", () => {
  assert.deepEqual([0, 1, 2].map(i => emiDueDate(emi, i)), ["2026-01-31", "2026-02-28", "2026-03-31"]);
  assert.equal(emiDueDate({ ...emi, first_due_date: "2028-01-31" }, 1), "2028-02-29");
  assert.equal(emiDueDate({ ...emi, first_due_date: "2026-12-31" }, 1), "2027-01-31");
});

test("reminder window uses IST, catches missed runs, excludes due/overdue and finished plans", () => {
  assert.equal(upcomingEmis(emi, new Date("2026-01-27T18:29:59Z")).length, 0);
  assert.equal(upcomingEmis(emi, new Date("2026-01-27T18:30:00Z")).length, 1);
  assert.equal(upcomingEmis(emi, new Date("2026-01-30T10:00:00Z")).length, 1);
  assert.equal(upcomingEmis(emi, new Date("2026-01-31T10:00:00Z")).length, 0);
  assert.equal(upcomingEmis(emi, new Date("2026-04-28T10:00:00Z")).length, 0);
  assert.equal(upcomingEmis({ ...emi, enabled: false }, new Date("2026-01-28T10:00:00Z")).length, 0);
});

test("EMI validates inputs, whitelists fields and leaves invoice accounting unchanged", () => {
  const invoice = { payment_mode: "EMI", invoice_date: "2026-01-01", payment_status: "PAID", emi };
  assert.deepEqual(validateEmi(invoice), {});
  assert.deepEqual(validateEmi({ ...invoice, invoice_date: new Date("2026-01-01") }), {});
  for (const changes of [{ amount: 0 }, { amount: "abc" }, { installments: 1.5 }, { installments: 361 }, { first_due_date: "2026-02-30" }, { first_due_date: "2025-12-31" }, { reminder_days_before: 0 }]) {
    assert.ok(Object.keys(validateEmi({ ...invoice, emi: { ...emi, ...changes } })).length);
  }
  assert.deepEqual(normalizeEmi({ ...invoice, emi: { ...emi, shop_id: "untrusted" } }), emi);
  assert.equal(normalizeEmi({ payment_mode: "CASH", emi }), null);
  const items = [{ selling_price: 1180, quantity: 1 }];
  assert.deepEqual(calculateInvoiceTotals({ invoice, items }), calculateInvoiceTotals({ invoice: { payment_status: "PAID" }, items }));
});

test("delivery claims prevent concurrent sends and map all five Hindi template variables", async t => {
  const scheduler = new EmiReminderScheduler();
  let claimed = false;
  let sends = 0;
  t.mock.method(EmiReminderDelivery, "create", async () => {
    if (claimed) throw Object.assign(new Error("duplicate"), { code: 11000 });
    claimed = true;
    return { _id: "claim" };
  });
  t.mock.method(EmiReminderDelivery, "findOneAndUpdate", async () => null);
  t.mock.method(EmiReminderDelivery, "updateOne", async (filter, update) => {
    assert.equal(filter.shop_id, "shop");
    assert.equal(update.$set.status, "SENT");
  });
  t.mock.method(scheduler, "createReminderLog", async () => ({ _id: "log" }));
  t.mock.method(scheduler.messageSender, "sendTemplateMessage", async payload => {
    sends++;
    assert.equal(payload.templateName, "product_emi_reminder_hi");
    assert.equal(payload.languageCode, "hi");
    assert.deepEqual(Object.values(payload.variables).slice(0, 4), ["राहुल शर्मा", "Samsung LED TV", "2,500", "31-01-2026"]);
    assert.ok(payload.variables[5]);
    return { success: true };
  });
  const args = [{ _id: "shop", shop_name: "Shop" }, { _id: "invoice", emi }, { full_name: "राहुल शर्मा" }, "919876543210", "Samsung LED TV", "2026-01-31"];
  await Promise.all(Array.from({ length: 10 }, () => scheduler.sendInstallment(...args)));
  assert.equal(sends, 1);
});

test("scheduler scopes all child reads to active shop and processes PAID invoices", async t => {
  const scope = { shop_id: "shop", deleted_at: null };
  const invoice = { _id: "invoice", customer_id: "customer", payment_mode: "EMI", payment_status: "PAID", invoice_date: new Date("2026-01-01"), emi };
  t.mock.method(Shop, "find", query => { assert.deepEqual(query, { deleted_at: null }); return { lean: async () => [{ _id: "shop" }] }; });
  t.mock.method(Invoice, "find", query => {
    assert.deepEqual(query, { ...scope, "emi.enabled": true });
    return { cursor: async function* () { yield invoice; } };
  });
  t.mock.method(Customer, "findOne", query => {
    assert.deepEqual(query, { ...scope, _id: "customer" });
    return { lean: async () => ({ full_name: "Customer", whatsapp_number: "9876543210" }) };
  });
  t.mock.method(InvoiceItem, "find", query => {
    assert.deepEqual(query, { ...scope, invoice_id: "invoice" });
    return { select: () => ({ lean: async () => [{ product_name: "TV" }] }) };
  });
  const scheduler = new EmiReminderScheduler();
  let sent = 0;
  t.mock.method(scheduler, "sendInstallment", async () => { sent++; });
  await scheduler.processEmiReminders(new Date("2026-01-28T10:00:00Z"));
  assert.equal(sent, 1);
});

test("concurrent invoice numbering regression with an offline atomic-counter stub", async t => {
  const session = { testSession: true };
  let counter = 0;
  t.mock.method(Invoice, "find", query => {
    assert.equal(query.shop_id, "shop");
    assert.equal(query.deleted_at, null);
    return { select: () => ({ session: async value => { assert.equal(value, session); return []; } }) };
  });
  t.mock.method(InvoiceCounter, "findOneAndUpdate", async (query, update, options) => {
    assert.equal(query.shop_id, "shop");
    assert.equal(options.session, session);
    counter += update.$inc.sequence;
    return { sequence: counter };
  });
  t.mock.method(Invoice, "findOne", query => {
    assert.equal(query.shop_id, "shop");
    assert.equal(query.deleted_at, null);
    return { session: async value => { assert.equal(value, session); return null; } };
  });
  const numbers = await Promise.all(Array.from({ length: 20 }, () =>
    InvoiceSequenceService.generateAuthoritativeInvoiceNumber("shop", new Date("2026-11-13T12:00:00Z"), session)));
  assert.equal(new Set(numbers).size, 20);
  assert.deepEqual(numbers.map(number => Number(number.split("-").at(-1))).sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
});
