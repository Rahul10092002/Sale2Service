import React, { useState } from "react";
import {
  Receipt,
  Calendar,
  CreditCard,
  MessageCircle,
  BellOff,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Input, SelectField } from "../ui/index.js";
import { INVOICE_CONSTANTS } from "../../utils/constants.js";
import { useInvoiceForm } from "../../features/invoices/hooks.js";

const InvoiceDetailsForm = () => {
  const { currentInvoice, updateInvoiceData, errors = {} } = useInvoiceForm();
  const [rawAmountPaid, setRawAmountPaid] = useState(null);

  const { invoice, customer } = currentInvoice;
  const advanceBalance = Number(customer?.advance_balance || 0);
  const totalAmount = Number(invoice?.total_amount || 0);

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

  const handleToggleWalletDeduction = (enabled) => {
    updateInvoiceData({
      use_advance_wallet: Boolean(enabled),
      collect_remaining_counter: false,
    });
  };

  const handleRemainingChoice = (collectNow) => {
    updateInvoiceData({
      collect_remaining_counter: Boolean(collectNow),
    });
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
        {/* Customer Advance Wallet Deduction Card (shown if customer has store credit > 0) */}
        {advanceBalance > 0 && (
          <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-emerald-50/30 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-emerald-950/20 space-y-3 transition-all shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
                      Customer Advance Wallet
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                      Available: ₹{advanceBalance.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5">
                    Deduct this bill amount directly from customer's advance balance / store credit.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={Boolean(invoice.use_advance_wallet)}
                  onChange={(e) => handleToggleWalletDeduction(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Active Wallet Deduction Breakdown */}
            {invoice.use_advance_wallet && (
              <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 space-y-2.5">
                {totalAmount > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-white/90 dark:bg-dark-card border border-indigo-100 dark:border-dark-border">
                        <span className="text-[10px] text-gray-500 dark:text-slate-400 block">
                          Invoice Total
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          ₹{totalAmount.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block">
                          Wallet Deducted
                        </span>
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                          -₹{Math.min(advanceBalance, totalAmount).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div
                        className={`p-2 rounded-lg border ${
                          totalAmount <= advanceBalance
                            ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40"
                            : "bg-amber-50/90 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40"
                        }`}
                      >
                        <span
                          className={`text-[10px] font-semibold block ${
                            totalAmount <= advanceBalance
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {totalAmount <= advanceBalance
                            ? "Remaining Wallet Balance"
                            : "Remaining Bill Due"}
                        </span>
                        <span
                          className={`font-extrabold ${
                            totalAmount <= advanceBalance
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {totalAmount <= advanceBalance
                            ? `₹${(advanceBalance - totalAmount).toLocaleString("en-IN")}`
                            : `₹${(totalAmount - advanceBalance).toLocaleString("en-IN")}`}
                        </span>
                      </div>
                    </div>

                    {/* Outcome notification badge */}
                    {totalAmount <= advanceBalance ? (
                      <div className="p-2.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>100% Fully Settled:</strong> Customer's advance wallet covers this bill in full. Invoice is marked as <strong>PAID</strong> via Wallet.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-lg bg-amber-100/70 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            <strong>Partially Covered:</strong> Wallet pays ₹{advanceBalance.toLocaleString("en-IN")}, leaving <strong>₹{(totalAmount - advanceBalance).toLocaleString("en-IN")}</strong> balance.
                          </span>
                        </div>

                        {/* Choice for remaining balance */}
                        <div className="bg-white/80 dark:bg-dark-card p-2.5 rounded-xl border border-indigo-100 dark:border-dark-border space-y-2">
                          <span className="text-xs font-bold text-gray-800 dark:text-slate-200 block">
                            How should the remaining ₹{(totalAmount - advanceBalance).toLocaleString("en-IN")} be handled?
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <label
                              className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                !invoice.collect_remaining_counter
                                  ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
                                  : "border-gray-200 dark:border-dark-border text-gray-600 dark:text-slate-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="walletPartialChoice"
                                checked={!invoice.collect_remaining_counter}
                                onChange={() => handleRemainingChoice(false)}
                                className="mt-0.5 text-amber-600 focus:ring-amber-500"
                              />
                              <div>
                                <span className="font-bold block text-xs">
                                  Mark as Pending (PARTIAL)
                                </span>
                                <span className="text-[10px] text-gray-500 dark:text-slate-400">
                                  Requires due date for remaining ₹{(totalAmount - advanceBalance).toLocaleString("en-IN")}
                                </span>
                              </div>
                            </label>

                            <label
                              className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                invoice.collect_remaining_counter
                                  ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                                  : "border-gray-200 dark:border-dark-border text-gray-600 dark:text-slate-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="walletPartialChoice"
                                checked={Boolean(invoice.collect_remaining_counter)}
                                onChange={() => handleRemainingChoice(true)}
                                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                              />
                              <div>
                                <span className="font-bold block text-xs">
                                  Collect Remaining Now (PAID)
                                </span>
                                <span className="text-[10px] text-gray-500 dark:text-slate-400">
                                  Pay remaining ₹{(totalAmount - advanceBalance).toLocaleString("en-IN")} now via Cash/UPI
                                </span>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-slate-400 italic">
                    Add products or services above to calculate wallet deduction.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

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
            {invoice.use_advance_wallet && totalAmount <= advanceBalance ? (
              <div>
                <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  Payment Status
                </label>
                <div className="h-9 sm:h-8 px-3 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center justify-between">
                  <span>PAID</span>
                  <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                    100% from Wallet
                  </span>
                </div>
              </div>
            ) : invoice.use_advance_wallet && !invoice.collect_remaining_counter ? (
              <div>
                <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  Payment Status
                </label>
                <div className="h-9 sm:h-8 px-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center justify-between">
                  <span>PARTIAL</span>
                  <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">
                    Wallet + Remaining Due
                  </span>
                </div>
              </div>
            ) : (
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
            )}
          </div>

          {/* Payment Mode (only for PAID or PARTIAL) */}
          {isPaidOrPartial && (
            <div>
              {invoice.use_advance_wallet && totalAmount <= advanceBalance ? (
                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <div className="h-9 sm:h-8 px-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 font-bold text-xs flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Advance Wallet</span>
                  </div>
                </div>
              ) : (
                <SelectField
                  id="payment-mode"
                  label={
                    invoice.use_advance_wallet && invoice.collect_remaining_counter
                      ? `Counter Mode (for remaining ₹${Math.max(0, totalAmount - advanceBalance).toLocaleString("en-IN")})`
                      : "Payment Mode"
                  }
                  value={
                    invoice.payment_mode === "ADVANCE_WALLET" && invoice.collect_remaining_counter
                      ? "CASH"
                      : invoice.payment_mode || "CASH"
                  }
                  onChange={(e) =>
                    updateInvoiceData({ payment_mode: e.target.value })
                  }
                  options={Object.entries(INVOICE_CONSTANTS.PAYMENT_MODES)
                    .filter(([key]) => key !== "ADVANCE_WALLET")
                    .map(([, value]) => ({
                      value: value,
                      label: value,
                    }))}
                  required
                />
              )}
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

          {/* Amount Paid (for Partial without wallet) */}
          {isPartial && !invoice.use_advance_wallet && (
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

          {/* Amount Paid display when wallet deduction partial is active */}
          {isPartial && invoice.use_advance_wallet && (
            <div>
              <label className="block text-xs font-bold text-ink-secondary dark:text-slate-200 mb-1">
                Paid from Wallet
              </label>
              <div className="h-9 sm:h-8 px-3 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">
                  ₹{Math.min(advanceBalance, totalAmount).toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-gray-500 font-normal">
                  Remaining: ₹{Math.max(0, totalAmount - advanceBalance).toLocaleString("en-IN")}
                </span>
              </div>
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
