import React, { useEffect } from "react";
import { Calculator, CreditCard, Receipt } from "lucide-react";
import { useInvoiceForm } from "../../features/invoices/hooks.js";

const InvoiceSummary = ({ className = "" }) => {
  const { currentInvoice, recalculateInvoice } = useInvoiceForm();
  const { invoice, invoice_items } = currentInvoice;

  // Recalculate whenever items change
  useEffect(() => {
    recalculateInvoice();
  }, [invoice_items, invoice.discount, recalculateInvoice]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const itemsCount = invoice_items.length;
  const totalQuantity = invoice_items.reduce(
    (sum, item) => sum + (parseInt(item.quantity) || 1),
    0,
  );

  return (
    <div
      className={`bg-white dark:bg-dark-card  rounded-lg shadow-sm border border-gray-200  dark:border-dark-border ${className}`}
    >
      <div className="px-3 py-2 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card">
        <h3 className="text-md font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-indigo-600 " />
          Invoice Summary
        </h3>
      </div>

      <div className="p-3 space-y-2">
        {/* Items Overview */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-ink-secondary dark:text-slate-100">Products</span>
          <span className="font-medium text-gray-900 dark:text-slate-100">
            {itemsCount} items ({totalQuantity} qty)
          </span>
        </div>

        {/* Amount Breakdown */}
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-ink-secondary dark:text-slate-100">Subtotal</span>
            <span className="font-medium text-gray-900 dark:text-slate-100">
              {formatCurrency(invoice.subtotal)}
            </span>
          </div>

          {invoice.discount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-ink-secondary dark:text-slate-100">Discount</span>
              <span className="font-medium text-red-600 dark:text-slate-100">
                -{formatCurrency(invoice.discount)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-ink-secondary dark:text-slate-100 ">Tax (18% GST)</span>
            <span className="font-medium text-gray-900 dark:text-slate-100">
              {formatCurrency(invoice.tax)}
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-ink-base dark:text-slate-100">
              Total Amount
            </span>
            <span className="text-sm font-bold text-indigo-600 dark:text-slate-100">
              {formatCurrency(invoice.total_amount)}
            </span>
          </div>
        </div>

        {/* Payment Status */}
        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <span className="text-ink-secondary dark:text-slate-100">Payment:</span>
            <span
              className={`font-medium px-2 py-1 rounded-full text-xs ${
                invoice.payment_status === "PAID"
                  ? "bg-green-100 text-green-800"
                  : invoice.payment_status === "PARTIAL"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {invoice.payment_status}
            </span>
            <span className="text-ink-secondary dark:text-slate-100">via {invoice.payment_mode}</span>
          </div>
          {/* Show paid/remaining amounts for partial or unpaid */}
          {(invoice.payment_status === "PARTIAL" ||
            invoice.payment_status === "UNPAID") && (
            <div className="mt-2 text-sm space-y-1">
              {invoice.payment_status === "PARTIAL" && (
                <div className="flex justify-between items-center">
                  <span className="text-ink-secondary dark:text-slate-1 00">Amount Paid</span>
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {formatCurrency(invoice.amount_paid)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-ink-secondary dark:text-slate-400">Amount Due</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(invoice.amount_due)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {itemsCount > 0 && (
          <div className="border-t border-gray-200 pt-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-1">
              <Receipt className="w-3 h-3" />
              Product Breakdown
            </h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {invoice_items.map((item, index) => {
                const qty = Number(item.quantity) || 1;
                const originalUnit = Number(item.selling_price || 0);
                const originalLine = originalUnit * qty;
                const isTaxInclusive = invoice.is_tax_inclusive !== false;
                const taxRate = 0.18;
                
                const lineTotal = isTaxInclusive ? originalLine : originalLine * (1 + taxRate);
                const lineTax = isTaxInclusive ? originalLine - (originalLine / (1 + taxRate)) : originalLine * taxRate;
                const lineTaxable = lineTotal - lineTax;
                const unitTaxable = lineTaxable / qty;

                return (
                  <div key={item.id || index} className="space-y-0.5 border-b border-gray-100 dark:border-dark-border pb-1 mb-1 last:border-0">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-slate-100 truncate max-w-[60%] font-medium">
                        {item.product_name || `Product ${index + 1}`}
                        {item.quantity > 1 && ` (×${item.quantity})`}
                      </span>
                      <span className="text-gray-900 font-bold dark:text-slate-100">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-slate-500">
                      <span>Rate: {formatCurrency(unitTaxable)}</span>
                      <span>Tax (18%): {formatCurrency(lineTax)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceSummary;
