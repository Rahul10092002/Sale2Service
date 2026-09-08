import React, { useState, useEffect, useRef } from "react";
import {
  Calculator,
  ChevronUp,
  ChevronDown,
  Save,
  Percent,
  Receipt,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "../ui/index.js";

/**
 * MobileInvoiceSummaryBar
 * 
 * High-performance, touch-friendly sticky bottom bar & slide-up drawer
 * for mobile invoice creation and editing.
 */
export default function MobileInvoiceSummaryBar({
  invoice,
  items = [],
  rawDiscount,
  setRawDiscount,
  updateInvoiceData,
  onSubmit,
  isSubmitting,
  errors = {},
  submitError = null,
  submitLabel = "Create Invoice",
  loadingLabel = "Creating...",
}) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [localRawOldItem, setLocalRawOldItem] = useState(null);
  const drawerRef = useRef(null);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);

  const errorCount = Object.keys(errors).length;

  useEffect(() => {
    if (errorCount > 0 || submitError) {
      setShowErrorBanner(true);
    }
  }, [errorCount, submitError]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showDrawer) {
        setShowDrawer(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDrawer]);

  // Smoothly scroll to the first error on the page
  const scrollToFirstError = () => {
    const errorEl = document.querySelector(".border-danger, [data-error='true'], .border-red-500, input.border-red-500");
    if (errorEl) {
      errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof errorEl.focus === "function") {
        errorEl.focus();
      }
    }
  };

  const handleActionClick = () => {
    if (errorCount > 0) {
      scrollToFirstError();
      return;
    }
    onSubmit();
  };

  return (
    <div className="lg:hidden">
      {/* Backdrop overlay when summary drawer is open */}
      {showDrawer && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 animate-in fade-in duration-200"
          onClick={() => setShowDrawer(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating/Sticky Action Bar Container */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-all duration-300"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
        role="region"
        aria-label="Mobile Invoice Actions"
      >
        {/* Error Notification Toast on Mobile (if any) */}
        {showErrorBanner && (errorCount > 0 || submitError) && (
          <div className="mx-3 mt-2 mb-1 p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center justify-between gap-2 shadow-xs animate-in slide-in-from-bottom-1">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <button
                type="button"
                onClick={scrollToFirstError}
                className="text-xs font-semibold text-rose-800 dark:text-rose-200 truncate text-left hover:underline"
              >
                {submitError
                  ? typeof submitError === "string"
                    ? submitError
                    : "Submission failed"
                  : errors.general || `${errorCount} required field${errorCount > 1 ? "s" : ""} need attention`}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowErrorBanner(false)}
              className="p-1 text-rose-500 hover:text-rose-700 rounded-md"
              aria-label="Dismiss error banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Expandable Slide-Up Breakdown Drawer */}
        {showDrawer && (
          <div className="px-4 pt-2 pb-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/95 dark:bg-dark-card/95 max-h-[70vh] overflow-y-auto space-y-3.5 animate-in slide-in-from-bottom duration-250">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wide">
                    Invoice Breakdown
                  </h4>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400">
                    {items.length} item{items.length === 1 ? "" : "s"} included
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-200/50 dark:hover:bg-gray-800"
                aria-label="Close summary breakdown"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Detailed Calculation Rows */}
            <div className="space-y-2.5 text-xs font-medium bg-white dark:bg-dark-bg p-3 rounded-xl border border-gray-200/70 dark:border-dark-border">
              <div className="flex justify-between items-center text-gray-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>

              {/* Quick Discount Input */}
              <div className="flex justify-between items-center gap-3 pt-1 border-t border-dashed border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-slate-300 flex items-center gap-1">
                  <Percent className="w-3 h-3 text-amber-600" />
                  Discount (₹)
                </span>
                <div className="w-32">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={
                      rawDiscount !== null
                        ? rawDiscount
                        : invoice.discount || 0
                    }
                    onChange={(e) => {
                      setRawDiscount(e.target.value);
                      const discount = parseFloat(e.target.value) || 0;
                      updateInvoiceData({ discount });
                    }}
                    onBlur={() => setRawDiscount(null)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-dark-border dark:bg-dark-input rounded-lg font-bold text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Old Item / Battery Exchange Input */}
              <div className="flex justify-between items-center gap-3 pt-1 border-t border-dashed border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-slate-300 flex items-center gap-1">
                  <Receipt className="w-3 h-3 text-amber-600" />
                  Old Item / Exchange (₹)
                </span>
                <div className="w-32">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={
                      localRawOldItem !== null
                        ? localRawOldItem
                        : invoice.old_item_exchange_price || 0
                    }
                    onChange={(e) => {
                      setLocalRawOldItem(e.target.value);
                      const old_item_exchange_price =
                        parseFloat(e.target.value) || 0;
                      updateInvoiceData({ old_item_exchange_price });
                    }}
                    onBlur={() => setLocalRawOldItem(null)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-dark-border dark:bg-dark-input rounded-lg font-bold text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Tax Settings */}
              <div className="flex justify-between items-center text-gray-600 dark:text-slate-300 pt-1 border-t border-dashed border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span>GST Tax (18%)</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateInvoiceData({
                        is_tax_inclusive: !(invoice.is_tax_inclusive !== false),
                      })
                    }
                    className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800"
                  >
                    {invoice.is_tax_inclusive !== false ? "Inclusive" : "Exclusive"}
                  </button>
                </div>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {formatCurrency(invoice.tax)}
                </span>
              </div>

              {/* Grand Total */}
              <div className="pt-2.5 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4" />
                  Total Payable
                </span>
                <span className="text-base">{formatCurrency(invoice.total_amount)}</span>
              </div>

              {/* Partial Payment breakdown if selected */}
              {invoice.payment_status === "PARTIAL" && (
                <div className="pt-1.5 border-t border-dashed border-amber-200 dark:border-amber-900/50 flex justify-between items-center text-xs font-bold text-amber-700 dark:text-amber-400">
                  <span>Remaining Balance Due</span>
                  <span>{formatCurrency(invoice.amount_due)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Primary Sticky Bottom Bar Row */}
        <div className="px-3 pt-2.5 flex items-center justify-between gap-3">
          {/* Summary Trigger Pill (Left Thumb Reach) */}
          <button
            type="button"
            onClick={() => setShowDrawer((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/80 active:scale-95 transition-all focus:outline-none min-w-[120px]"
            aria-expanded={showDrawer}
            aria-label="Toggle invoice summary breakdown"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-semibold leading-none flex items-center gap-1">
                {items.length} Item{items.length === 1 ? "" : "s"}
                <ChevronUp
                  className={`w-3.5 h-3.5 text-indigo-500 transition-transform duration-200 ${
                    showDrawer ? "rotate-180" : ""
                  }`}
                />
              </span>
              <strong className="text-base font-extrabold text-gray-900 dark:text-slate-100 leading-tight block">
                {formatCurrency(invoice.total_amount)}
              </strong>
            </div>
          </button>

          {/* Primary Action Button (Right Thumb Reach) */}
          <Button
            type="button"
            onClick={handleActionClick}
            disabled={isSubmitting}
            className={`
              flex-1 min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md
              flex items-center justify-center gap-2 transition-all active:scale-98
              ${
                errorCount > 0
                  ? "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-600/20"
                  : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-600/25"
              }
            `}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>{loadingLabel}</span>
              </>
            ) : errorCount > 0 ? (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>Fix {errorCount} Issue{errorCount > 1 ? "s" : ""}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{submitLabel}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
