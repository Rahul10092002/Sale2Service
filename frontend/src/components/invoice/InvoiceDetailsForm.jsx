import React, { useState } from "react";
import { Receipt, Calendar, CreditCard, MessageCircle, BellOff } from "lucide-react";
import { Input, SelectField } from "../ui/index.js";
import { INVOICE_CONSTANTS } from "../../utils/constants.js";
import { useInvoiceForm } from "../../features/invoices/hooks.js";

const InvoiceDetailsForm = () => {
  const { currentInvoice, updateInvoiceData, errors = {} } = useInvoiceForm();
  const [rawAmountPaid, setRawAmountPaid] = useState(null);

  const { invoice } = currentInvoice;

  const todayStr = new Date().toISOString().split("T")[0];
  const isPastDate = Boolean(invoice.invoice_date && invoice.invoice_date < todayStr);
  const daysDiff = isPastDate
    ? Math.round(
        (new Date(todayStr).getTime() - new Date(invoice.invoice_date).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const isPaidOrPartial =
    invoice.payment_status === INVOICE_CONSTANTS.PAYMENT_STATUSES.PAID ||
    invoice.payment_status === INVOICE_CONSTANTS.PAYMENT_STATUSES.PARTIAL ||
    invoice.payment_status === "PAID" ||
    invoice.payment_status === "PARTIAL";

  const isUnpaidOrPartial =
    invoice.payment_status === INVOICE_CONSTANTS.PAYMENT_STATUSES.UNPAID ||
    invoice.payment_status === INVOICE_CONSTANTS.PAYMENT_STATUSES.PARTIAL ||
    invoice.payment_status === "UNPAID" ||
    invoice.payment_status === "PARTIAL";

  const isPartial =
    invoice.payment_status === INVOICE_CONSTANTS.PAYMENT_STATUSES.PARTIAL ||
    invoice.payment_status === "PARTIAL";

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-200/90 dark:border-dark-border rounded-xl p-3 sm:p-4 shadow-xs relative transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-gray-100 dark:border-dark-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Receipt className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">
              Invoice & Payment Terms
            </h2>
            <p className="text-[11px] text-ink-muted dark:text-slate-400 mt-0.5">
              Invoice date, payment status, and WhatsApp notification preferences
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Invoice Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300">
                Invoice Date *
              </label>
              {isPastDate && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 text-amber-800 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800">
                  🗓️ Old Bill ({daysDiff}d ago)
                </span>
              )}
            </div>
            <div className="flex gap-1.5 items-center">
              <Input
                type="date"
                value={invoice.invoice_date || ""}
                onChange={(e) =>
                  updateInvoiceData({ invoice_date: e.target.value })
                }
                error={errors["invoice.invoice_date"]}
                inputClassName="h-9 sm:h-8 text-xs flex-1"
              />
              <button
                type="button"
                onClick={() =>
                  updateInvoiceData({
                    invoice_date: todayStr,
                  })
                }
                title="Reset to today's date"
                className="px-2.5 py-1.5 h-9 sm:h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
              >
                Today
              </button>
            </div>
          </div>

          {/* Payment Status */}
          <div>
            <SelectField
              id="payment-status"
              label="Payment Status"
              value={invoice.payment_status || "PAID"}
              onChange={(e) => {
                const newStatus = e.target.value;
                updateInvoiceData({ payment_status: newStatus });
                if (
                  newStatus !== INVOICE_CONSTANTS.PAYMENT_STATUSES.PARTIAL &&
                  newStatus !== "PARTIAL"
                ) {
                  updateInvoiceData({ amount_paid: 0 });
                  setRawAmountPaid(null);
                }
              }}
              options={Object.entries(INVOICE_CONSTANTS.PAYMENT_STATUSES).map(
                ([, value]) => ({
                  value: value,
                  label: value,
                }),
              )}
              required
            />
          </div>

          {/* Payment Mode (only for PAID or PARTIAL) */}
          {isPaidOrPartial && (
            <div>
              <SelectField
                id="payment-mode"
                label="Payment Mode"
                value={invoice.payment_mode || "CASH"}
                onChange={(e) =>
                  updateInvoiceData({ payment_mode: e.target.value })
                }
                options={Object.entries(INVOICE_CONSTANTS.PAYMENT_MODES).map(
                  ([, value]) => ({
                    value: value,
                    label: value,
                  }),
                )}
                required
              />
            </div>
          )}

          {/* Due Date (for Unpaid / Partial) */}
          {isUnpaidOrPartial && (
            <div>
              <label className="block text-xs font-bold text-ink-secondary dark:text-slate-200 mb-1">
                Payment Due Date *
              </label>
              <Input
                type="date"
                value={invoice.due_date || ""}
                onChange={(e) =>
                  updateInvoiceData({ due_date: e.target.value })
                }
                error={errors["invoice.due_date"]}
                inputClassName="h-9 sm:h-8 text-xs"
              />
            </div>
          )}

          {/* Amount Paid (for Partial) */}
          {isPartial && (
            <div>
              <label className="block text-xs font-bold text-ink-secondary dark:text-slate-200 mb-1">
                Amount Paid (₹) *
              </label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={
                  rawAmountPaid !== null
                    ? rawAmountPaid
                    : invoice.amount_paid || 0
                }
                onChange={(e) => {
                  setRawAmountPaid(e.target.value);
                  updateInvoiceData({
                    amount_paid: parseFloat(e.target.value) || 0,
                  });
                }}
                onBlur={() => setRawAmountPaid(null)}
                error={errors["invoice.amount_paid"]}
                inputClassName="h-9 sm:h-8 text-xs font-semibold"
              />
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1">
                Remaining Due: {formatCurrency(invoice.amount_due)}
              </p>
            </div>
          )}
        </div>

        {/* WhatsApp Notification Delivery Settings */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            invoice.send_whatsapp !== false
              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40"
              : "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/70"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  invoice.send_whatsapp !== false
                    ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                }`}
              >
                {invoice.send_whatsapp !== false ? (
                  <MessageCircle className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
                    Send WhatsApp Notification
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      invoice.send_whatsapp !== false
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                        : "bg-amber-200 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200"
                    }`}
                  >
                    {invoice.send_whatsapp !== false
                      ? "Enabled (Sends on Create)"
                      : "Disabled (Silent / Old Bill Mode)"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-0.5">
                  {invoice.send_whatsapp !== false
                    ? "Customer will receive an automated WhatsApp message with PDF bill link upon creation."
                    : "🔕 No WhatsApp message will be sent. Perfect for entering old / existing bills into the database without notifying the customer."}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={invoice.send_whatsapp !== false}
                onChange={(e) =>
                  updateInvoiceData({ send_whatsapp: e.target.checked })
                }
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsForm;
