import React, { useEffect } from "react";
import { Calculator, CreditCard, Receipt, Package, Wrench } from "lucide-react";
import { useInvoiceForm } from "../../features/invoices/hooks.js";

const InvoiceSummary = ({ className = "" }) => {
  const { currentInvoice, recalculateInvoice } = useInvoiceForm();
  const { invoice, invoice_items } = currentInvoice;

  // Recalculate whenever items change
  useEffect(() => {
    recalculateInvoice();
  }, [
    invoice_items,
    invoice.discount,
    invoice.old_item_exchange_price,
    recalculateInvoice,
  ]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const itemsCount = invoice_items.length;
  const productItems = invoice_items.filter((i) => i.item_type !== "SERVICE");
  const serviceItems = invoice_items.filter((i) => i.item_type === "SERVICE");
  const totalQuantity = invoice_items.reduce(
    (sum, item) => sum + (parseInt(item.quantity) || 1),
    0,
  );

  return (
    <div
      className={`bg-white dark:bg-dark-card rounded-xl border border-gray-200/90 dark:border-dark-border shadow-xs overflow-hidden ${className}`}
    >
      <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-dark-border/60 bg-gray-50/60 dark:bg-dark-card flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Invoice Summary
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
          {itemsCount} item{itemsCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Items Overview */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-ink-secondary dark:text-slate-300 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-gray-400" />
              Products
            </span>
            <span className="font-semibold text-gray-900 dark:text-slate-100">
              {productItems.length} ({totalQuantity} qty)
            </span>
          </div>
          {serviceItems.length > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-emerald-500" />
                Services & Repairs
              </span>
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                {serviceItems.length} charge{serviceItems.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>

        {/* Amount Breakdown */}
        <div className="space-y-2 border-t border-gray-100 dark:border-dark-border/60 pt-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-ink-secondary dark:text-slate-300">Subtotal</span>
            <span className="font-semibold text-gray-900 dark:text-slate-100">
              {formatCurrency(invoice.subtotal)}
            </span>
          </div>

          {invoice.discount > 0 && (
            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Discount</span>
              <span>-{formatCurrency(invoice.discount)}</span>
            </div>
          )}

          {invoice.old_item_exchange_price > 0 && (
            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-medium">
              <span>Old Item / Exchange</span>
              <span>-{formatCurrency(invoice.old_item_exchange_price)}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-ink-secondary dark:text-slate-300">
              GST (18% {invoice.is_tax_inclusive !== false ? "inclusive" : "added"})
            </span>
            <span className="font-semibold text-gray-900 dark:text-slate-100">
              {formatCurrency(invoice.tax)}
            </span>
          </div>
        </div>

        {/* Total Grand Amount */}
        <div className="border-t border-gray-100 dark:border-dark-border/60 pt-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">
              Total Amount
            </span>
            <span className="text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(invoice.total_amount)}
            </span>
          </div>
        </div>

        {/* Payment Terms & Badges */}
        <div className="border-t border-gray-100 dark:border-dark-border/60 pt-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-ink-secondary dark:text-slate-300">
              <CreditCard className="w-3.5 h-3.5 text-gray-400" />
              <span>Status</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                  invoice.payment_status === "PAID"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40"
                    : invoice.payment_status === "PARTIAL"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40"
                }`}
              >
                {invoice.payment_status}
              </span>
              {invoice.payment_status !== "UNPAID" && (
                <span className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">
                  via {invoice.payment_mode}
                </span>
              )}
            </div>
          </div>

          {/* Show paid/remaining amounts for partial or unpaid */}
          {(invoice.payment_status === "PARTIAL" ||
            invoice.payment_status === "UNPAID") && (
            <div className="mt-2 text-xs space-y-1 bg-gray-50/80 dark:bg-dark-bg/60 p-2 rounded-lg border border-gray-100 dark:border-dark-border/40">
              {invoice.payment_status === "PARTIAL" && (
                <div className="flex justify-between items-center">
                  <span className="text-ink-secondary dark:text-slate-300">Amount Paid</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">
                    {formatCurrency(invoice.amount_paid)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-rose-600 dark:text-rose-400 font-bold">Amount Due</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(invoice.amount_due)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Breakdown Items List */}
        {itemsCount > 0 && (
          <div className="border-t border-gray-100 dark:border-dark-border/60 pt-2.5">
            <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100 mb-1.5 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-gray-400" />
              Item Breakdown
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
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
                  <div key={item.id || index} className="p-1.5 rounded-lg bg-gray-50/60 dark:bg-dark-bg/40 border border-gray-100 dark:border-dark-border/40 text-xs">
                    <div className="flex justify-between font-semibold text-gray-900 dark:text-slate-100">
                      <span className="truncate max-w-[65%]">
                        {item.product_name || `Item ${index + 1}`}
                        {item.quantity > 1 && ` (×${item.quantity})`}
                      </span>
                      <span>{formatCurrency(lineTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                      <span>Rate: {formatCurrency(unitTaxable)}</span>
                      <span>GST: {formatCurrency(lineTax)}</span>
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
