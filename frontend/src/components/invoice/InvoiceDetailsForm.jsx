import React, { useState } from "react";
import { Receipt, Calendar, CreditCard } from "lucide-react";
import { Input, SelectField } from "../ui/index.js";
import { INVOICE_CONSTANTS } from "../../utils/constants.js";
import { useInvoiceForm } from "../../features/invoices/hooks.js";

const InvoiceDetailsForm = () => {
  const { currentInvoice, updateInvoiceData, errors = {} } = useInvoiceForm();
  const [rawAmountPaid, setRawAmountPaid] = useState(null);

  const { invoice } = currentInvoice;

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
              Invoice date, payment status, and due date schedule
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Invoice Date */}
          <div>
            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
              Invoice Date *
            </label>
            <Input
              type="date"
              value={invoice.invoice_date || ""}
              onChange={(e) =>
                updateInvoiceData({ invoice_date: e.target.value })
              }
              error={errors["invoice.invoice_date"]}
              icon={<Calendar className="w-4 h-4 text-gray-400" />}
              inputClassName="h-9 sm:h-8 text-xs"
            />
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
      </div>
    </div>
  );
};

export default InvoiceDetailsForm;
