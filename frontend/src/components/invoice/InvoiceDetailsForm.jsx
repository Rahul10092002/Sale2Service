import React, { useState } from "react";
import { Receipt, Calendar, CreditCard } from "lucide-react";
import { Input, SelectField } from "../ui/index.js";
import { INVOICE_CONSTANTS } from "../../utils/constants.js";
import { useInvoiceForm } from "../../features/invoices/hooks.js";

const InvoiceDetailsForm = () => {
  const { currentInvoice, updateInvoiceData, errors } = useInvoiceForm();
  const [rawAmountPaid, setRawAmountPaid] = useState(null);

  const { invoice } = currentInvoice;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
        <div className="px-2 py-2 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            Invoice Details
          </h2>
          <p className="text-xs text-ink-muted dark:text-slate-500 mt-1">
            Configure invoice settings and payment information
          </p>
        </div>

        <div className="p-3 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Invoice Date */}
            <div>
              <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                Invoice Date *
              </label>
              <div className="relative">
                <Input
                  type="date"
                  value={invoice.invoice_date}
                  onChange={(e) =>
                    updateInvoiceData({ invoice_date: e.target.value })
                  }
                  error={errors["invoice.invoice_date"]}
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                />
              </div>
            </div>

            {/* Payment Status */}
            <div>
              <SelectField
                id="payment-status"
                label="Payment Status"
                value={invoice.payment_status}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  updateInvoiceData({ payment_status: newStatus });
                  // Clear amount_paid when switching away from PARTIAL
                  if (
                    newStatus !== INVOICE_CONSTANTS.PAYMENT_STATUSES.PARTIAL
                  ) {
                    updateInvoiceData({ amount_paid: 0 });
                    setRawAmountPaid(null);
                  }
                }}
                options={Object.entries(INVOICE_CONSTANTS.PAYMENT_STATUSES).map(
                  ([key, value]) => ({
                    value: value,
                    label: value,
                  }),
                )}
                required
              />
            </div>

            {/* Payment Mode */}
            <div>
              <SelectField
                id="payment-mode"
                label="Payment Mode"
                value={invoice.payment_mode}
                onChange={(e) =>
                  updateInvoiceData({ payment_mode: e.target.value })
                }
                options={Object.entries(INVOICE_CONSTANTS.PAYMENT_MODES).map(
                  ([key, value]) => ({
                    value: value,
                    label: value,
                  }),
                )}
                required
              />
            </div>

            {/* Due Date for unpaid/partial */}
            {(invoice.payment_status ===
              INVOICE_CONSTANTS.PAYMENT_STATUSES.UNPAID ||
              invoice.payment_status ===
                INVOICE_CONSTANTS.PAYMENT_STATUSES.PARTIAL) && (
              <div>
                <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  Due Date *
                </label>
                <Input
                  type="date"
                  value={invoice.due_date || ""}
                  onChange={(e) =>
                    updateInvoiceData({ due_date: e.target.value })
                  }
                  error={errors["invoice.due_date"]}
                />
              </div>
            )}
            {invoice.payment_status ===
              INVOICE_CONSTANTS.PAYMENT_STATUSES.PARTIAL && (
              <div>
                <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  Amount Paid *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
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
                />
                <p className="text-xs text-gray-500 mt-1">
                  Remaining: {formatCurrency(invoice.amount_due)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsForm;
