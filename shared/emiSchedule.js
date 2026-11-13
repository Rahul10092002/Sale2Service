import { roundCurrency } from "./invoiceMath.js";

// Third-party finance information only: never changes invoice balances or GST.
export const EMI_TEMPLATE_NAME = "product_emi_reminder_hi";
const DAY = 86400000;

export function validateEmi(invoice) {
  const errors = {};
  if (invoice.payment_mode !== "EMI") return errors;
  const emi = invoice.emi || {};
  if (!Number.isFinite(Number(emi.amount)) || Number(emi.amount) < 0.01) {
    errors["invoice.emi.amount"] = "Enter an EMI amount of at least 0.01";
  }
  if (!Number.isInteger(Number(emi.installments)) || Number(emi.installments) < 1 || Number(emi.installments) > 360) {
    errors["invoice.emi.installments"] = "Number of EMIs must be between 1 and 360";
  }
  const date = String(emi.first_due_date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    errors["invoice.emi.first_due_date"] = "Enter a valid first EMI due date";
  } else if (date < (invoice.invoice_date instanceof Date ? invoice.invoice_date.toISOString().slice(0, 10) : String(invoice.invoice_date || "").slice(0, 10))) {
    errors["invoice.emi.first_due_date"] = "First EMI cannot be before the invoice date";
  }
  const days = Number(emi.reminder_days_before ?? 3);
  if (!Number.isInteger(days) || days < 1 || days > 28) {
    errors["invoice.emi.reminder_days_before"] = "Reminder must be 1 to 28 days before EMI";
  }
  if (invoice.use_advance_wallet) errors["invoice.emi"] = "Disable advance wallet to select third-party EMI";
  return errors;
}

export function normalizeEmi(invoice) {
  if (invoice.payment_mode !== "EMI") return null;
  const emi = invoice.emi;
  return {
    amount: roundCurrency(Number(emi.amount)),
    installments: Number(emi.installments),
    first_due_date: emi.first_due_date,
    reminder_days_before: Number(emi.reminder_days_before ?? 3),
    enabled: emi.enabled !== false,
  };
}

// Anchor every month to the original day; Jan 31 -> Feb 28 -> Mar 31.
export function emiDueDate(emi, index) {
  const [year, month, day] = emi.first_due_date.split("-").map(Number);
  const last = new Date(Date.UTC(year, month + index, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + index, Math.min(day, last))).toISOString().slice(0, 10);
}

export function upcomingEmis(emi, now = new Date()) {
  if (!emi || emi.enabled === false) return [];
  const today = new Date(now.getTime() + 19800000).toISOString().slice(0, 10);
  const end = new Date(Date.parse(today) + emi.reminder_days_before * DAY).toISOString().slice(0, 10);
  return Array.from({ length: emi.installments }, (_, index) => ({ index, dueDate: emiDueDate(emi, index) }))
    .filter(({ dueDate }) => dueDate > today && dueDate <= end);
}
