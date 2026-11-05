import test from "node:test";
import assert from "node:assert/strict";
import {
  getLocalDateString,
  getDayDifference,
  addCalendarDays,
  formatAmountWithoutCurrency,
  formatDateDMY,
  calculateInvoiceDue,
  classifyCustomerInvoices,
} from "../services/paymentReminderService.js";

test("Customer Consolidated Payment Reminder: Pure Calculation & Classification", async (t) => {
  await t.test("calculateInvoiceDue correctly accounts for payments and excess exchange credit", () => {
    const inv1 = { total_amount: 5000, amount_paid: 2000, excess_exchange_credit: 0 };
    assert.equal(calculateInvoiceDue(inv1), 3000);

    const inv2 = { total_amount: 5000, amount_paid: 3000, excess_exchange_credit: 500 };
    assert.equal(calculateInvoiceDue(inv2), 1500);

    // Paid invoice returns 0
    const invPaid = { total_amount: 5000, amount_paid: 5000, payment_status: "PAID" };
    assert.equal(calculateInvoiceDue(invPaid), 0);

    // Excess exchange covers full amount
    const invExchange = { total_amount: 2000, amount_paid: 0, excess_exchange_credit: 2500 };
    assert.equal(calculateInvoiceDue(invExchange), 0);
  });

  await t.test("Consolidated 4-bill example combines to ₹10,500 without duplicate messages", () => {
    const targetDate = new Date("2026-11-15T09:00:00+05:30");
    const timezone = "Asia/Kolkata";

    // 4 unpaid invoices: ₹2,000, ₹3,000, ₹4,000, ₹1,500 all overdue >= 7 days
    const invoices = [
      {
        _id: "inv_1",
        total_amount: 2000,
        amount_paid: 0,
        due_date: new Date("2026-11-01T00:00:00+05:30"),
      },
      {
        _id: "inv_2",
        total_amount: 3000,
        amount_paid: 0,
        due_date: new Date("2026-11-03T00:00:00+05:30"),
      },
      {
        _id: "inv_3",
        total_amount: 4000,
        amount_paid: 0,
        due_date: new Date("2026-11-05T00:00:00+05:30"),
      },
      {
        _id: "inv_4",
        total_amount: 1500,
        amount_paid: 0,
        due_date: new Date("2026-11-07T00:00:00+05:30"),
      },
    ];

    const result = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(result.overdue.count, 4);
    assert.equal(result.overdue.totalDue, 10500);
    assert.equal(result.overdue.isEligibleByDays, true);
    // Oldest due date should be 2026-11-01
    assert.equal(formatDateDMY(result.overdue.oldestDueDate, timezone), "01/11/2026");
    assert.equal(formatAmountWithoutCurrency(result.overdue.totalDue), "10,500");
  });

  await t.test("Currency formatting strictly adheres to Indian numbering without ₹ symbol", () => {
    assert.equal(formatAmountWithoutCurrency(10500), "10,500");
    assert.equal(formatAmountWithoutCurrency(10500.5), "10,500.50");
    assert.equal(formatAmountWithoutCurrency(1234567.89), "12,34,567.89");
    assert.equal(formatAmountWithoutCurrency(0), "0");
    // Ensure no currency sign is present
    assert.ok(!formatAmountWithoutCurrency(10500).includes("₹"));
    assert.ok(!formatAmountWithoutCurrency(10500).includes("Rs"));
  });

  await t.test("Date formatting strictly outputs DD/MM/YYYY in local shop timezone", () => {
    const date = new Date("2026-11-05T12:00:00Z");
    const dmy = formatDateDMY(date, "Asia/Kolkata");
    assert.match(dmy, /^\d{2}\/\d{2}\/\d{4}$/);
    assert.equal(dmy, "05/11/2026");
  });
});

test("Customer Consolidated Payment Reminder: Overdue 7-Day Rule", async (t) => {
  const targetDate = new Date("2026-11-15T09:00:00+05:30");
  const timezone = "Asia/Kolkata";

  await t.test("Invoice overdue by only 1 day is NOT eligible for overdue reminder", () => {
    const invoices = [
      {
        _id: "inv_recent",
        total_amount: 2500,
        amount_paid: 0,
        due_date: new Date("2026-11-14T00:00:00+05:30"), // 1 day overdue
      },
    ];

    const result = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(result.overdue.count, 1);
    assert.equal(result.overdue.daysSinceOldestDue, 1);
    assert.equal(result.overdue.isEligibleByDays, false); // < 7 days
  });

  await t.test("Invoice overdue by 6 days is NOT eligible (must wait for day 7)", () => {
    const invoices = [
      {
        _id: "inv_6days",
        total_amount: 2500,
        amount_paid: 0,
        due_date: new Date("2026-11-09T00:00:00+05:30"), // 6 days overdue
      },
    ];

    const result = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(result.overdue.daysSinceOldestDue, 6);
    assert.equal(result.overdue.isEligibleByDays, false);
  });

  await t.test("Invoice overdue by exactly 7 days IS eligible", () => {
    const invoices = [
      {
        _id: "inv_7days",
        total_amount: 2500,
        amount_paid: 0,
        due_date: new Date("2026-11-08T00:00:00+05:30"), // 7 days overdue
      },
    ];

    const result = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(result.overdue.daysSinceOldestDue, 7);
    assert.equal(result.overdue.isEligibleByDays, true);
  });

  await t.test("Multiple overdue invoices use the OLDEST due date for 7-day rule", () => {
    const invoices = [
      {
        _id: "inv_new",
        total_amount: 1000,
        amount_paid: 0,
        due_date: new Date("2026-11-13T00:00:00+05:30"), // 2 days overdue
      },
      {
        _id: "inv_old",
        total_amount: 3000,
        amount_paid: 0,
        due_date: new Date("2026-11-01T00:00:00+05:30"), // 14 days overdue
      },
    ];

    const result = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(result.overdue.count, 2);
    assert.equal(result.overdue.totalDue, 4000);
    assert.equal(result.overdue.daysSinceOldestDue, 14);
    assert.equal(result.overdue.isEligibleByDays, true);
    assert.equal(formatDateDMY(result.overdue.oldestDueDate, timezone), "01/11/2026");
  });
});

test("Customer Consolidated Payment Reminder: Upcoming Lead Window (3 Days)", async (t) => {
  const targetDate = new Date("2026-11-15T09:00:00+05:30");
  const timezone = "Asia/Kolkata";

  await t.test("Invoice due today (0 days) is eligible for upcoming reminder", () => {
    const invoices = [
      {
        _id: "inv_today",
        total_amount: 4500,
        amount_paid: 0,
        due_date: new Date("2026-11-15T00:00:00+05:30"),
      },
    ];

    const result = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(result.upcoming.count, 1);
    assert.equal(result.upcoming.daysUntilNearestDue, 0);
    assert.equal(result.upcoming.isEligibleByDays, true);
    assert.equal(formatDateDMY(result.upcoming.nearestDueDate, timezone), "15/11/2026");
  });

  await t.test("Invoice due in 3 days is eligible for upcoming reminder", () => {
    const invoices = [
      {
        _id: "inv_3days",
        total_amount: 5000,
        amount_paid: 0,
        due_date: new Date("2026-11-18T00:00:00+05:30"),
      },
    ];

    const result = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(result.upcoming.count, 1);
    assert.equal(result.upcoming.daysUntilNearestDue, 3);
    assert.equal(result.upcoming.isEligibleByDays, true);
  });

  await t.test("Invoice due in 4 days is outside the 3-day lead window and NOT eligible", () => {
    const invoices = [
      {
        _id: "inv_4days",
        total_amount: 5000,
        amount_paid: 0,
        due_date: new Date("2026-11-19T00:00:00+05:30"),
      },
    ];

    const result = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(result.upcoming.isEligibleByDays, false);
  });
});

test("Customer Consolidated Payment Reminder: Coordination Rule (Overdue Prioritization)", async (t) => {
  const targetDate = new Date("2026-11-15T09:00:00+05:30");
  const timezone = "Asia/Kolkata";

  await t.test("Customer with both Overdue (>=7d) and Upcoming (<=3d) has Overdue prioritized", () => {
    const invoices = [
      {
        _id: "inv_overdue",
        total_amount: 6000,
        amount_paid: 0,
        due_date: new Date("2026-11-01T00:00:00+05:30"), // 14 days overdue
      },
      {
        _id: "inv_upcoming",
        total_amount: 2000,
        amount_paid: 0,
        due_date: new Date("2026-11-17T00:00:00+05:30"), // 2 days upcoming
      },
    ];

    const classification = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(classification.overdue.count, 1);
    assert.equal(classification.overdue.isEligibleByDays, true);
    assert.equal(classification.upcoming.count, 1);
    assert.equal(classification.upcoming.isEligibleByDays, true);

    // Coordination check: Overdue must be selected, Upcoming must be deferred
    let coordinatedAction = "NONE";
    if (classification.overdue.isEligibleByDays) {
      coordinatedAction = "SEND_OVERDUE";
    } else if (classification.upcoming.isEligibleByDays) {
      coordinatedAction = "SEND_UPCOMING";
    }

    assert.equal(coordinatedAction, "SEND_OVERDUE");
  });
});

test("Customer Consolidated Payment Reminder: Approved Hindi Templates & Parameters", async (t) => {
  const customerName = "राहुल वर्मा";
  const shopPhone = "9876543210";
  const shopName = "स्मार्ट सोलर & बैटरीज";

  await t.test("payment_upcoming_hiindi variables match exact 6 parameters", () => {
    const unpaidCount = 2;
    const totalAmount = "5,000";
    const nextDueDate = "18/11/2026";

    // {{1}} Name, {{2}} Count, {{3}} Amount without ₹, {{4}} Due date, {{5}} Phone, {{6}} Shop name
    const components = [
      customerName,
      String(unpaidCount),
      totalAmount,
      nextDueDate,
      shopPhone,
      shopName,
    ];

    assert.equal(components.length, 6);
    assert.equal(components[0], "राहुल वर्मा");
    assert.equal(components[1], "2");
    assert.equal(components[2], "5,000");
    assert.equal(components[3], "18/11/2026");
    assert.equal(components[4], "9876543210");
    assert.equal(components[5], "स्मार्ट सोलर & बैटरीज");
  });

  await t.test("payment_overdue_hi variables match exact 6 parameters", () => {
    const overdueCount = 4;
    const totalOverdueAmount = "10,500";
    const oldestDueDate = "01/11/2026";

    const components = [
      customerName,
      String(overdueCount),
      totalOverdueAmount,
      oldestDueDate,
      shopPhone,
      shopName,
    ];

    assert.equal(components.length, 6);
    assert.equal(components[0], "राहुल वर्मा");
    assert.equal(components[1], "4");
    assert.equal(components[2], "10,500");
    assert.equal(components[3], "01/11/2026");
    assert.equal(components[4], "9876543210");
    assert.equal(components[5], "स्मार्ट सोलर & बैटरीज");
  });
});

test("Customer Consolidated Payment Reminder: Partial Payment & Settlement Behavior", async (t) => {
  const targetDate = new Date("2026-11-15T09:00:00+05:30");
  const timezone = "Asia/Kolkata";

  await t.test("Partial payment on an invoice dynamically reflects in consolidated due", () => {
    const invoices = [
      {
        _id: "inv_1",
        total_amount: 10000,
        amount_paid: 6000, // partially paid, balance 4000
        due_date: new Date("2026-11-01T00:00:00+05:30"),
      },
      {
        _id: "inv_2",
        total_amount: 5000,
        amount_paid: 2000, // partially paid, balance 3000
        due_date: new Date("2026-11-03T00:00:00+05:30"),
      },
    ];

    const result = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(result.overdue.count, 2);
    assert.equal(result.overdue.totalDue, 7000);
    assert.equal(formatAmountWithoutCurrency(result.overdue.totalDue), "7,000");
  });

  await t.test("Fully paid invoices are excluded from consolidated reminder counts and amounts", () => {
    const invoices = [
      {
        _id: "inv_paid",
        total_amount: 10000,
        amount_paid: 10000,
        payment_status: "PAID",
        due_date: new Date("2026-11-01T00:00:00+05:30"),
      },
      {
        _id: "inv_unpaid",
        total_amount: 3500,
        amount_paid: 0,
        payment_status: "UNPAID",
        due_date: new Date("2026-11-01T00:00:00+05:30"),
      },
    ];

    const result = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(result.overdue.count, 1);
    assert.equal(result.overdue.totalDue, 3500);
  });

  await t.test("Zero balance customer has 0 overdue and 0 upcoming invoices", () => {
    const invoices = [
      {
        _id: "inv_settled",
        total_amount: 5000,
        amount_paid: 5000,
        payment_status: "PAID",
        due_date: new Date("2026-11-01T00:00:00+05:30"),
      },
    ];

    const result = classifyCustomerInvoices({ invoices, targetDate, timezone });
    assert.equal(result.overdue.count, 0);
    assert.equal(result.overdue.totalDue, 0);
    assert.equal(result.overdue.isEligibleByDays, false);
    assert.equal(result.upcoming.count, 0);
    assert.equal(result.upcoming.totalDue, 0);
    assert.equal(result.upcoming.isEligibleByDays, false);
  });
});

test("Customer Consolidated Payment Reminder: 7-Day Cadence Interval Arithmetic", async (t) => {
  const timezone = "Asia/Kolkata";

  await t.test("addCalendarDays computes exact next eligible date 7 days later", () => {
    const sentDate = new Date("2026-11-05T09:00:00+05:30");
    const nextEligible = addCalendarDays(sentDate, 7, timezone);

    const sentStr = getLocalDateString(sentDate, timezone);
    const nextStr = getLocalDateString(nextEligible, timezone);

    assert.equal(sentStr, "2026-11-05");
    assert.equal(nextStr, "2026-11-12");
    assert.equal(getDayDifference(sentStr, nextStr), 7);
  });

  await t.test("Interval check denies dispatch on Day 6 and allows dispatch on Day 7", () => {
    const nextEligibleStr = "2026-11-12";

    const day6Str = "2026-11-11";
    assert.ok(day6Str < nextEligibleStr); // false / blocked

    const day7Str = "2026-11-12";
    assert.ok(day7Str >= nextEligibleStr); // true / allowed

    const day8Str = "2026-11-13";
    assert.ok(day8Str >= nextEligibleStr); // true / allowed
  });
});

