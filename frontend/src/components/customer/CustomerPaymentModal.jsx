import React, { useState, useEffect, useMemo } from "react";
import {
  Modal as Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
} from "../ui/index.js";
import { formatDate } from "../../utils/date.js";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  CreditCard,
  FileText,
  Package,
  Receipt,
  RotateCcw,
  Sparkles,
  Wallet,
  Smartphone,
  MessageSquare,
} from "lucide-react";

/**
 * CustomerPaymentModal provides a touch-first, mobile PWA-friendly modal
 * to record bulk or partial customer payments across pending invoices (FIFO).
 * It shows a live auto-distribution breakdown across unpaid bills, credits any
 * excess amount to the customer's advance wallet, and confirms allocations before submit.
 */
export default function CustomerPaymentModal({
  isOpen,
  onClose,
  customer = {},
  ledgerSummary = {},
  invoices = [],
  ledgerEntries = [],
  onRecordPayment,
  isLoading = false,
}) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [paymentNotes, setPaymentNotes] = useState("");
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showBillsDetails, setShowBillsDetails] = useState(true);

  // Normalize unpaid invoices sorted chronologically (FIFO - oldest date first)
  const unpaidInvoices = useMemo(() => {
    // Prefer full invoice objects from customer data if provided
    if (Array.isArray(invoices) && invoices.length > 0) {
      return invoices
        .filter((inv) => {
          if (inv.payment_status === "PAID") return false;
          const total = Number(inv.total_amount || 0);
          const paid = Number(inv.amount_paid || 0);
          const credit = Number(inv.excess_exchange_credit || 0);
          const due = Math.max(0, total - (paid + credit));
          return due > 0;
        })
        .map((inv) => {
          const total = Number(inv.total_amount || 0);
          const paid = Number(inv.amount_paid || 0);
          const credit = Number(inv.excess_exchange_credit || 0);
          let itemsSummary = "";
          if (Array.isArray(inv.services) && inv.services.length > 0) {
            itemsSummary = inv.services.map((s) => s.product_name).join(", ");
          }
          return {
            _id: inv._id,
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date || inv.createdAt,
            total_amount: total,
            amount_paid: paid,
            netDue: Math.max(0, total - (paid + credit)),
            items_summary: itemsSummary,
            payment_status: inv.payment_status,
          };
        })
        .sort(
          (a, b) =>
            new Date(a.invoice_date || a.createdAt) -
            new Date(b.invoice_date || b.createdAt)
        );
    }

    // Fallback to ledger entries
    if (Array.isArray(ledgerEntries) && ledgerEntries.length > 0) {
      return ledgerEntries
        .filter((e) => (e.invoice_balance || 0) > 0)
        .map((e) => ({
          _id: e._id,
          invoice_number: e.invoice_number,
          invoice_date: e.invoice_date,
          total_amount: Number(e.debit || 0),
          amount_paid: Number(e.amount_paid || 0),
          netDue: Number(e.invoice_balance || 0),
          items_summary: e.items_summary,
          payment_status: e.payment_status,
        }))
        .sort(
          (a, b) =>
            new Date(a.invoice_date || a.createdAt) -
            new Date(b.invoice_date || b.createdAt)
        );
    }

    return [];
  }, [invoices, ledgerEntries]);

  // Total customer dues (from ledger summary or sum of unpaid invoices)
  const totalDue = useMemo(() => {
    if (ledgerSummary?.total_due !== undefined && Number(ledgerSummary.total_due) > 0) {
      return Number(ledgerSummary.total_due);
    }
    return unpaidInvoices.reduce((sum, inv) => sum + inv.netDue, 0);
  }, [ledgerSummary?.total_due, unpaidInvoices]);

  const advanceBalance = Number(customer?.advance_balance || 0);

  // Initialize or reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentAmount(totalDue > 0 ? String(totalDue) : "");
      setPaymentMethod("CASH");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setPaymentNotes("");
      setSendWhatsapp(true);
      setShowConfirmation(false);
      setShowBillsDetails(true);
    }
  }, [isOpen, totalDue]);

  // Real-time calculations for distribution
  const numEntered = parseFloat(paymentAmount) || 0;
  const appliedToBills = Math.min(numEntered, totalDue);
  const excessAmount = Math.max(0, numEntered - totalDue);

  // FIFO simulated distribution across pending invoices
  const simulatedAllocation = useMemo(() => {
    if (numEntered <= 0 || unpaidInvoices.length === 0) return [];
    let rem = numEntered;
    const list = [];
    for (const inv of unpaidInvoices) {
      if (rem <= 0) break;
      const alloc = Math.min(rem, inv.netDue);
      const remainingDueAfter = Math.max(0, inv.netDue - alloc);
      list.push({
        ...inv,
        allocated: alloc,
        remainingDueAfter,
        statusAfter: remainingDueAfter === 0 ? "PAID" : "PARTIAL",
      });
      rem -= alloc;
    }
    return list;
  }, [numEntered, unpaidInvoices]);

  if (!isOpen) return null;

  const handleInitialSubmit = (e) => {
    e?.preventDefault();
    if (!numEntered || numEntered <= 0) return;

    // If customer has unpaid dues and payment exceeds them, ask confirmation for advance wallet credit
    if (totalDue > 0 && excessAmount > 0) {
      setShowConfirmation(true);
    } else {
      executeRecord();
    }
  };

  const executeRecord = () => {
    if (!onRecordPayment) return;
    onRecordPayment({
      amount: numEntered,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      notes: paymentNotes,
      send_whatsapp: sendWhatsapp,
    });
  };

  const handleQuickAdd = (increment) => {
    const cur = parseFloat(paymentAmount) || 0;
    setPaymentAmount(String(Math.max(0, cur + increment)));
  };

  const paymentModes = [
    { id: "CASH", label: "Cash 💵" },
    { id: "UPI", label: "UPI / QR 📲" },
    { id: "CARD", label: "Card 💳" },
    { id: "NET_BANKING", label: "Net Banking 🏦" },
    { id: "CHEQUE", label: "Cheque 📝" },
  ];

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="lg" className="sm:max-w-lg">
      {/* PWA Touch-First Modal Header */}
      <DialogHeader onClose={onClose} className="py-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
            <Coins className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink-base dark:text-slate-100 leading-tight">
              {showConfirmation ? "Confirm Advance Allocation" : "Record Customer Payment"}
            </h2>
            <p className="text-xs text-ink-secondary dark:text-slate-400">
              Apply lump sum across pending invoices (FIFO order)
            </p>
          </div>
        </div>
      </DialogHeader>

      <DialogBody className="p-4 sm:p-6 max-h-[78vh] overflow-y-auto overscroll-contain">
        {!showConfirmation ? (
          <form onSubmit={handleInitialSubmit} className="space-y-4">
            {/* Customer & Dues Summary Card */}
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3.5 space-y-2.5 shadow-xs">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                    {customer?.full_name || "Customer"}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-gray-400" />
                    {customer?.whatsapp_number || "No phone"}
                  </p>
                </div>
                {advanceBalance > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                    <Wallet className="w-3 h-3" />
                    Adv: ₹{advanceBalance.toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              {/* Dues Metric Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-blue-100 dark:border-blue-900/40 text-center">
                <div className="bg-white/80 dark:bg-dark-card/80 p-2 rounded-lg border border-gray-100 dark:border-dark-border">
                  <span className="block text-[10px] text-gray-500 dark:text-slate-400">
                    Total Billed
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-xs">
                    ₹{Number(ledgerSummary?.total_invoiced || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="bg-white/80 dark:bg-dark-card/80 p-2 rounded-lg border border-gray-100 dark:border-dark-border">
                  <span className="block text-[10px] text-gray-500 dark:text-slate-400">
                    Total Paid
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                    ₹{Number(ledgerSummary?.total_paid || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="bg-red-50/80 dark:bg-red-950/30 p-2 rounded-lg border border-red-100 dark:border-red-900/50">
                  <span className="block text-[10px] text-red-600 dark:text-red-400 font-bold">
                    Total Due
                  </span>
                  <span className="font-extrabold text-red-600 dark:text-red-400 text-xs sm:text-sm font-mono">
                    ₹{totalDue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Received Amount Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-ink-base dark:text-slate-200">
                  Received Amount (₹) <span className="text-red-500">*</span>
                </label>
                {totalDue > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(totalDue))}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold underline active:opacity-75"
                  >
                    Full Due: ₹{totalDue.toLocaleString("en-IN")}
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">
                  ₹
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter received amount..."
                  required
                  className="w-full pl-8 pr-3 py-3 text-base sm:text-lg font-bold border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Mobile Quick-Fill Action Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-gray-400 font-medium mr-0.5">
                  Quick:
                </span>
                {totalDue > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(totalDue))}
                    className="px-2.5 py-1 text-xs rounded-lg font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 hover:bg-blue-200 transition-colors"
                  >
                    Full Due
                  </button>
                )}
                {[500, 1000, 2000, 5000].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => handleQuickAdd(inc)}
                    className="px-2.5 py-1 text-xs rounded-lg font-medium bg-gray-100 dark:bg-dark-input hover:bg-gray-200 dark:hover:bg-dark-border text-gray-700 dark:text-slate-200 border border-gray-200/60 dark:border-dark-border transition-colors"
                  >
                    +{inc.toLocaleString("en-IN")}
                  </button>
                ))}
                {paymentAmount && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount("")}
                    className="px-2 py-1 text-xs rounded-lg text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 ml-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Payment Method Selector (PWA Touch Chips) */}
            <div>
              <label className="block text-xs font-semibold text-ink-base dark:text-slate-200 mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {paymentModes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                      paymentMethod === m.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white dark:bg-dark-input text-gray-700 dark:text-slate-300 border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-subtle"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Date & Reference Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-base dark:text-slate-200 mb-1">
                  Payment Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-base dark:text-slate-200 mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Cheque / Note"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* WhatsApp Receipt Toggle */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-2.5 rounded-xl flex items-center gap-2.5">
              <input
                type="checkbox"
                id="sendWhatsappCustomer"
                checked={sendWhatsapp}
                onChange={(e) => setSendWhatsapp(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <label
                htmlFor="sendWhatsappCustomer"
                className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 cursor-pointer select-none leading-tight"
              >
                💬 Send WhatsApp payment receipt for updated invoices
              </label>
            </div>

            {/* Live Auto-Distribution Breakdown Card (Like RecordPaymentModal) */}
            {numEntered > 0 && (
              <div className="bg-gray-50/90 dark:bg-dark-input/40 border border-gray-200 dark:border-dark-border rounded-xl p-3.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-gray-800 dark:text-slate-200">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Auto-Distribution Breakdown (FIFO)</span>
                  </div>
                  {excessAmount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                      Wallet: +₹{excessAmount.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                {/* Summary Rows */}
                <div className="space-y-2 text-xs">
                  {appliedToBills > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border">
                      <span className="text-gray-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Applied to Unpaid Bills ({simulatedAllocation.length}):
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{appliedToBills.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  {excessAmount > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
                      <span className="text-gray-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                        <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        Customer Advance Wallet:
                      </span>
                      <span className="font-bold text-amber-700 dark:text-amber-300">
                        +₹{excessAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Detailed Breakdown of Individual Bills */}
                {simulatedAllocation.length > 0 && (
                  <div className="pt-2 border-t border-gray-200 dark:border-dark-border">
                    <button
                      type="button"
                      onClick={() => setShowBillsDetails(!showBillsDetails)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-gray-900 transition-colors py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Details of bills being cleared ({simulatedAllocation.length})
                      </span>
                      {showBillsDetails ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {showBillsDetails && (
                      <div className="mt-2 space-y-2 max-h-52 overflow-y-auto pr-1 overscroll-contain">
                        {simulatedAllocation.map((b) => (
                          <div
                            key={b._id}
                            className="bg-white dark:bg-dark-card rounded-xl p-2.5 border border-gray-100 dark:border-dark-border shadow-2xs space-y-1.5"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                  {b.invoice_number}
                                </span>
                                <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  <span>{formatDate(b.invoice_date)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 block">
                                  +₹{b.allocated.toLocaleString("en-IN")}
                                </span>
                                {b.remainingDueAfter === 0 ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded-full mt-0.5">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Cleared (PAID)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full mt-0.5">
                                    Rem. Due: ₹{b.remainingDueAfter.toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100 dark:border-dark-border text-gray-600 dark:text-slate-400">
                              <span>Bill Total: ₹{b.total_amount.toLocaleString("en-IN")}</span>
                              <span>Prior Due: ₹{b.netDue.toLocaleString("en-IN")}</span>
                            </div>

                            {/* Item/Product Summary if available */}
                            {b.items_summary && (
                              <div className="flex items-center gap-1 text-[10.5px] text-gray-500 dark:text-slate-400 truncate">
                                <Package className="w-3 h-3 shrink-0 text-gray-400" />
                                <span className="truncate">{b.items_summary}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        ) : (
          /* Confirmation Step View (Excess Payment Prompt like RecordPaymentModal) */
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-amber-950 dark:text-amber-100 mb-0.5">
                    Confirm Advance Wallet Deposit
                  </h3>
                  <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-300">
                    You entered <span className="font-extrabold">₹{numEntered.toLocaleString("en-IN")}</span>, which is{" "}
                    <span className="font-extrabold text-amber-900 dark:text-amber-200">+₹{excessAmount.toLocaleString("en-IN")}</span> more than the customer's total outstanding dues (₹{totalDue.toLocaleString("en-IN")}).
                  </p>
                  <p className="text-[11.5px] mt-1.5 text-amber-700 dark:text-amber-400">
                    The extra ₹{excessAmount.toLocaleString("en-IN")} will be credited to {customer?.full_name}'s Advance Wallet for upcoming invoices.
                  </p>
                </div>
              </div>
            </div>

            {/* Allocation Breakdown Summary Card */}
            <div className="rounded-xl border border-gray-200 dark:border-dark-border divide-y divide-gray-100 dark:divide-dark-border bg-white dark:bg-dark-card overflow-hidden text-xs sm:text-sm shadow-2xs">
              <div className="p-3 bg-gray-50/80 dark:bg-dark-subtle/80 flex justify-between items-center">
                <span className="font-medium text-ink-secondary dark:text-slate-400">
                  Total Payment Receiving:
                </span>
                <span className="font-extrabold text-base text-ink-base dark:text-slate-100">
                  ₹{numEntered.toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-semibold text-gray-500 font-mono">
                    ({paymentMethod})
                  </span>
                </span>
              </div>

              {appliedToBills > 0 && (
                <div className="p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-ink-base dark:text-slate-100 block">
                        Cleared Across Invoices ({simulatedAllocation.length})
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400">
                        All pending dues will become ₹0.00
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{appliedToBills.toLocaleString("en-IN")} ➔ PAID
                  </span>
                </div>
              )}

              {excessAmount > 0 && (
                <div className="p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-ink-base dark:text-slate-100 block">
                        Customer Advance Wallet
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400">
                        Store credit for future billings
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    +₹{excessAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>

            {/* Quick list of invoices getting cleared */}
            {simulatedAllocation.length > 0 && (
              <div className="bg-gray-50 dark:bg-dark-subtle/50 rounded-xl p-3 border border-gray-200/80 dark:border-dark-border text-xs space-y-1.5">
                <span className="font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                  Invoices Receiving Payment:
                </span>
                {simulatedAllocation.map((b) => (
                  <div key={b._id} className="flex justify-between items-center text-[11.5px]">
                    <span className="font-mono text-gray-600 dark:text-slate-300">
                      {b.invoice_number} ({formatDate(b.invoice_date)})
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +₹{b.allocated.toLocaleString("en-IN")}
                      {b.remainingDueAfter === 0 && " (Cleared)"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogBody>

      {/* PWA Friendly Touch Footer */}
      <DialogFooter className="px-4 py-3 sm:px-6 bg-gray-50 dark:bg-dark-input/50 flex flex-col-reverse sm:flex-row gap-2 sm:gap-2">
        {!showConfirmation ? (
          <>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto py-2.5 text-xs sm:text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInitialSubmit}
              loading={isLoading}
              disabled={isLoading || !numEntered || numEntered <= 0}
              className="w-full sm:w-auto py-2.5 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              {totalDue > 0 && excessAmount > 0
                ? "Review Advance Allocation"
                : "Confirm & Record Payment"}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
              className="w-full sm:w-auto py-2.5 text-xs sm:text-sm font-semibold"
            >
              Change Amount
            </Button>
            <Button
              onClick={executeRecord}
              loading={isLoading}
              disabled={isLoading}
              className="w-full sm:w-auto py-2.5 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              Confirm & Record (₹{numEntered.toLocaleString("en-IN")})
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}
