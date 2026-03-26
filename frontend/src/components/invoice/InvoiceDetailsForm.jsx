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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            Invoice Details
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure invoice settings and payment information
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invoice Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                onChange={(e) =>
                  updateInvoiceData({ payment_status: e.target.value })
                }
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={invoice.due_date || ""}
                  onChange={(e) =>
                    updateInvoiceData({ due_date: e.target.value })
                  }
                />
              </div>
            )}
            {invoice.payment_status ===
              INVOICE_CONSTANTS.PAYMENT_STATUSES.PARTIAL && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Paid
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
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
