import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calculator,
  ChevronUp,
  ChevronDown,
  Save,
  Percent,
  Receipt,
  AlertCircle,
  X,
  LayoutGrid,
  Home,
  Box,
  User,
  Table,
  ShieldCheck,
  Settings,
  Activity,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { Button } from "../ui/index.js";
import { ROUTES } from "../../utils/constants.js";

/**
 * MobileInvoiceSummaryBar
 * 
 * High-performance, touch-friendly sticky bottom bar & slide-up drawer
 * for mobile invoice creation and editing with quick navigation options.
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
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [localRawOldItem, setLocalRawOldItem] = useState(null);
  const drawerRef = useRef(null);
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: "Dashboard", path: ROUTES.DASHBOARD, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/40" },
    { icon: Receipt, label: "Invoices", path: ROUTES.INVOICES, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40" },
    { icon: Box, label: "Products", path: ROUTES.PRODUCTS, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40" },
    { icon: User, label: "Customers", path: ROUTES.CUSTOMERS, color: "text-violet-600 bg-violet-50 dark:bg-violet-900/40" },
    { icon: Table, label: "Purchases", path: ROUTES.INVENTORY, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/40" },
    { icon: ShieldCheck, label: "Warranty", path: ROUTES.WARRANTY, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/40" },
    { icon: Calendar, label: "Schedules", path: ROUTES.FESTIVAL_SCHEDULE, color: "text-pink-600 bg-pink-50 dark:bg-pink-900/40" },
    { icon: Activity, label: "Audit Logs", path: ROUTES.LOGS, color: "text-orange-600 bg-orange-50 dark:bg-orange-900/40" },
    { icon: Settings, label: "Settings", path: ROUTES.SETTINGS, color: "text-slate-600 bg-slate-100 dark:bg-slate-800" },
  ];

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

  // Handle escape key to close drawers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showDrawer) setShowDrawer(false);
        if (showNavDrawer) setShowNavDrawer(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDrawer, showNavDrawer]);

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
      {/* Backdrop overlay when summary drawer or nav drawer is open */}
      {(showDrawer || showNavDrawer) && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in duration-200"
          onClick={() => {
            setShowDrawer(false);
            setShowNavDrawer(false);
          }}
          aria-hidden="true"
        />
      )}

      {/* Slide-Up Navigation Drawer */}
      {showNavDrawer && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-slate-900 rounded-t-3xl px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl animate-in slide-in-from-bottom duration-250 border-t border-slate-200 dark:border-slate-800">
          {/* Grab Bar */}
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />

          {/* Header */}
          <div className="flex justify-between items-center mb-3.5 px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Navigate Pages
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Switch to any module (your form input is saved)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowNavDrawer(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full bg-slate-100 dark:bg-slate-800 active:scale-95 transition-transform"
              aria-label="Close navigation drawer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Exit Row */}
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowNavDrawer(false);
                navigate(ROUTES.INVOICES);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs active:scale-95 transition-all"
            >
              <ArrowLeft size={15} />
              <span>Back to Invoices List</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNavDrawer(false);
                navigate(ROUTES.DASHBOARD);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs active:scale-95 transition-all border border-blue-200 dark:border-blue-900"
            >
              <Home size={15} />
              <span>Go to Dashboard</span>
            </button>
          </div>

          {/* Navigation Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[50vh] overflow-y-auto pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowNavDrawer(false)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 text-center active:scale-95 transition-all"
                >
                  <div className={`p-2 rounded-xl ${item.color}`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-tight truncate max-w-full">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
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
        <div className="px-3 pt-2.5 flex items-center justify-between gap-2 sm:gap-3">
          {/* Quick Nav Button */}
          <button
            type="button"
            onClick={() => {
              setShowDrawer(false);
              setShowNavDrawer(true);
            }}
            className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all shrink-0 min-w-[50px] h-[46px] border border-slate-200/80 dark:border-slate-700"
            title="Navigate to other pages"
            aria-label="Navigate to other pages"
          >
            <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[9px] font-bold mt-0.5 leading-none">Pages</span>
          </button>

          {/* Summary Trigger Pill */}
          <button
            type="button"
            onClick={() => {
              setShowNavDrawer(false);
              setShowDrawer((prev) => !prev);
            }}
            className="flex items-center gap-1.5 sm:gap-2 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/80 active:scale-95 transition-all focus:outline-none min-w-0"
            aria-expanded={showDrawer}
            aria-label="Toggle invoice summary breakdown"
          >
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
              <Calculator className="w-4 h-4" />
            </div>
            <div className="text-left truncate">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-semibold leading-none flex items-center gap-0.5">
                {items.length} Item{items.length === 1 ? "" : "s"}
                <ChevronUp
                  className={`w-3 h-3 text-indigo-500 transition-transform duration-200 ${
                    showDrawer ? "rotate-180" : ""
                  }`}
                />
              </span>
              <strong className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-slate-100 leading-tight block truncate">
                {formatCurrency(invoice.total_amount)}
              </strong>
            </div>
          </button>

          {/* Primary Action Button */}
          <Button
            type="button"
            onClick={handleActionClick}
            disabled={isSubmitting}
            className={`
              flex-1 min-h-[46px] px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md
              flex items-center justify-center gap-1.5 transition-all active:scale-98
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
