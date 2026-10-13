import React, { useState, useEffect, useMemo } from "react";
import {
  Modal as Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
} from "../ui/index.js";
import { useGetCustomerByIdQuery } from "../../features/customers/customerApi.js";
import { formatDate } from "../../utils/date.js";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  FileText,
  Package,
  Receipt,
  RotateCcw,
  Sparkles,
  Wallet,
  Smartphone,
} from "lucide-react";

/**
 * RecordPaymentModal provides a touch-first, mobile PWA-optimized interface for recording
 * full, partial, or excess payments on an invoice. Excess payments are auto-allocated across
 * the customer's older pending bills (FIFO) with remaining funds credited to their advance balance.
 */
export default function RecordPaymentModal({
  isOpen,
  onClose,
  invoice = {},
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
  const [showOtherBillsDetails, setShowOtherBillsDetails] = useState(true);

  // Extract customer ID to query other pending invoices and advance wallet
  const customerId = invoice?.customer_id?._id || invoice?.customer_id;
  const { data: customerData } = useGetCustomerByIdQuery(customerId, {
    skip: !isOpen || !customerId,
  });

  const customer =
    customerData?.customer ||
    (typeof invoice?.customer_id === "object" ? invoice.customer_id : null);
  const advanceBalance = Number(customer?.advance_balance || 0);

  // Calculate current invoice dues
  const currentTotal = Number(invoice?.total_amount || 0);
  const currentPaid = Number(invoice?.amount_paid || 0);
  const currentExcessCredit = Number(invoice?.excess_exchange_credit || 0);
  const currentDue = Math.max(
    0,
    currentTotal - (currentPaid + currentExcessCredit)
  );

  // Initialize or reset fields when modal opens
  useEffect(() => {
    if (isOpen && invoice) {
      setPaymentAmount(String(currentDue > 0 ? currentDue : currentTotal || ""));
      setPaymentMethod(invoice.payment_mode || "CASH");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setPaymentNotes("");
      setSendWhatsapp(true);
      setShowConfirmation(false);
      setShowOtherBillsDetails(true);
    }
  }, [isOpen, invoice, currentDue, currentTotal]);

  // Find other unpaid/partially paid invoices for this customer
  const otherUnpaidInvoices = useMemo(() => {
    if (!customerData?.invoices) return [];
    const currentInvoiceId = String(invoice?._id || invoice?.id || "");
    return customerData.invoices
      .filter((inv) => {
        if (String(inv._id || inv.id) === currentInvoiceId) return false;
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
          ...inv,
          netDue: Math.max(0, total - (paid + credit)),
          items_summary: itemsSummary,
        };
      })
      .sort(
        (a, b) =>
          new Date(a.invoice_date || a.createdAt) -
          new Date(b.invoice_date || b.createdAt)
      );
  }, [customerData?.invoices, invoice?._id, invoice?.id]);

  // Calculations for excess distribution
  const numEntered = parseFloat(paymentAmount) || 0;
  const paymentForCurrent = Math.min(numEntered, currentDue);
  const excessAmount = Math.max(0, numEntered - currentDue);
  const currentDueAfter = Math.max(0, currentDue - paymentForCurrent);

  const totalOtherDues = otherUnpaidInvoices.reduce(
    (sum, inv) => sum + inv.netDue,
    0
  );
  const toOtherInvoices = Math.min(excessAmount, totalOtherDues);
  const toAdvanceBalance = Math.max(0, excessAmount - totalOtherDues);

  // Compute how excess will be simulated across other bills
  const simulatedAllocation = useMemo(() => {
    if (excessAmount <= 0) return [];
    let rem = excessAmount;
    const list = [];
    for (const inv of otherUnpaidInvoices) {
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
  }, [excessAmount, otherUnpaidInvoices]);

  if (!isOpen) return null;

  const handleInitialSubmit = (e) => {
    e?.preventDefault();
    if (!numEntered || numEntered <= 0) return;

    if (excessAmount > 0) {
      setShowConfirmation(true);
    } else {
      executeRecord();
    }
  };

  const executeRecord = () => {
    const payload = {
      amount: numEntered,
      payment_mode: paymentMethod,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      notes: paymentNotes,
      send_whatsapp: sendWhatsapp,
    };
    // Call onRecordPayment supporting both object payload and positional args
    onRecordPayment(payload, paymentMethod, payload);
  };

  const handleQuickAdd = (increment) => {
    const cur = parseFloat(paymentAmount) || 0;
    setPaymentAmount(String(Math.max(0, cur + increment)));
  };

  const paymentModes = [
    { id: "CASH", label: "Cash 💵" },
    { id: "UPI", label: "UPI / QR 📱" },
    { id: "CARD", label: "Card 💳" },
    { id: "BANK_TRANSFER", label: "Bank Transfer 🏦" },
    { id: "CHEQUE", label: "Cheque 📝" },
    { id: "MIXED", label: "Mixed 🔀" },
  ];

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="lg" className="sm:max-w-lg">
      {/* PWA Touch-First Modal Header */}
      <DialogHeader onClose={onClose} className="py-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-xs">
            <Coins className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink-base dark:text-slate-100 leading-tight">
              {showConfirmation ? "Confirm Excess Allocation" : "Record Payment"}
            </h2>
            <p className="text-xs text-ink-secondary dark:text-slate-400">
              {invoice?.invoice_number ? `Invoice #${invoice.invoice_number}` : "Payment Entry"}
            </p>
          </div>
        </div>
      </DialogHeader>

      <DialogBody className="p-4 sm:p-6 max-h-[78vh] overflow-y-auto overscroll-contain">
        {!showConfirmation ? (
          <form onSubmit={handleInitialSubmit} className="space-y-4">
            {/* Customer & Dues Summary Card */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3.5 space-y-2.5 shadow-xs">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                    {customer?.full_name || invoice?.customer_id?.full_name || "Customer"}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-gray-400" />
                    {customer?.whatsapp_number || invoice?.customer_id?.whatsapp_number || "No phone"}
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
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-100 dark:border-emerald-900/40 text-center">
                <div className="bg-white/80 dark:bg-dark-card/80 p-2 rounded-lg border border-gray-100 dark:border-dark-border">
                  <span className="block text-[10px] text-gray-500 dark:text-slate-400">
                    Total Billed
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-xs">
                    ₹{currentTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="bg-white/80 dark:bg-dark-card/80 p-2 rounded-lg border border-gray-100 dark:border-dark-border">
                  <span className="block text-[10px] text-gray-500 dark:text-slate-400">
                    Total Paid
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                    ₹{currentPaid.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="bg-red-50/80 dark:bg-red-950/30 p-2 rounded-lg border border-red-100 dark:border-red-900/50">
                  <span className="block text-[10px] text-red-600 dark:text-red-400 font-bold">
                    Bill Due
                  </span>
                  <span className="font-extrabold text-red-600 dark:text-red-400 text-xs sm:text-sm font-mono">
                    ₹{currentDue.toLocaleString("en-IN")}
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
                {currentDue > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(currentDue))}
                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold underline active:opacity-75"
                  >
                    Exact Due: ₹{currentDue.toLocaleString("en-IN")}
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
                  className="w-full pl-8 pr-3 py-3 text-base sm:text-lg font-bold border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Mobile Quick-Fill Action Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-gray-400 font-medium mr-0.5">
                  Quick:
                </span>
                {currentDue > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(currentDue))}
                    className="px-2.5 py-1 text-xs rounded-lg font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 hover:bg-emerald-200 transition-colors"
                  >
                    Exact Due
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
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
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
                    className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* WhatsApp Receipt Toggle */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-2.5 rounded-xl flex items-center gap-2.5">
              <input
                type="checkbox"
                id="sendWhatsappInvoice"
                checked={sendWhatsapp}
                onChange={(e) => setSendWhatsapp(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <label
                htmlFor="sendWhatsappInvoice"
                className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 cursor-pointer select-none leading-tight"
              >
                💬 Send WhatsApp payment receipt to customer
              </label>
            </div>

            {/* Live Auto-Distribution Breakdown Card */}
            {numEntered > 0 && (
              <div className="bg-gray-50/90 dark:bg-dark-input/40 border border-gray-200 dark:border-dark-border rounded-xl p-3.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-gray-800 dark:text-slate-200">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Auto-Distribution Breakdown (FIFO)</span>
                  </div>
                  {excessAmount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                      Extra: +₹{excessAmount.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                {/* Summary Rows */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border">
                    <span className="text-gray-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                      <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      This Invoice ({invoice?.invoice_number || "Current"}):
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{paymentForCurrent.toLocaleString("en-IN")}{" "}
                      <span className="text-[10px] font-semibold">
                        ({currentDueAfter === 0 ? "PAID" : `Due: ₹${currentDueAfter.toLocaleString("en-IN")}`})
                      </span>
                    </span>
                  </div>

                  {toOtherInvoices > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-sky-50/80 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40">
                      <span className="text-gray-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                        <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        Other Pending Bills ({simulatedAllocation.length}):
                      </span>
                      <span className="font-bold text-sky-700 dark:text-sky-300">
                        ₹{toOtherInvoices.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  {toAdvanceBalance > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
                      <span className="text-gray-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                        <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        Customer Advance Wallet:
                      </span>
                      <span className="font-bold text-amber-700 dark:text-amber-300">
                        +₹{toAdvanceBalance.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Detailed List of Other Bills Receiving Payment */}
                {simulatedAllocation.length > 0 && (
                  <div className="pt-2 border-t border-gray-200 dark:border-dark-border">
                    <button
                      type="button"
                      onClick={() => setShowOtherBillsDetails(!showOtherBillsDetails)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-slate-300 hover:text-gray-900 transition-colors py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        Details of other bills being cleared ({simulatedAllocation.length})
                      </span>
                      {showOtherBillsDetails ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {showOtherBillsDetails && (
                      <div className="mt-2 space-y-2 max-h-52 overflow-y-auto pr-1 overscroll-contain">
                        {simulatedAllocation.map((b) => (
                          <div
                            key={b._id}
                            className="bg-white dark:bg-dark-card rounded-xl p-2.5 border border-emerald-100 dark:border-emerald-900/50 shadow-2xs space-y-1.5"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-mono font-bold text-xs text-ink-base dark:text-slate-100">
                                  {b.invoice_number}
                                </span>
                                <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  <span>{formatDate(b.invoice_date || b.createdAt)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 block">
                                  +₹{b.allocated.toLocaleString("en-IN")}
                                </span>
                                {b.remainingDueAfter === 0 ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded-full mt-0.5">
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
                              <span>Bill Total: ₹{Number(b.total_amount || 0).toLocaleString("en-IN")}</span>
                              <span>Prior Due: ₹{Number(b.netDue || 0).toLocaleString("en-IN")}</span>
                            </div>

                            {/* Service / Item snippet if available */}
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
          /* Confirmation Step View (Excess Payment Prompt like CustomerPaymentModal) */
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-amber-950 dark:text-amber-100 mb-0.5">
                    Confirm Excess Payment Allocation
                  </h3>
                  <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-300">
                    You entered <span className="font-extrabold">₹{numEntered.toLocaleString("en-IN")}</span>, which is{" "}
                    <span className="font-extrabold text-amber-900 dark:text-amber-200">+₹{excessAmount.toLocaleString("en-IN")}</span> more than the amount due for this invoice (₹{currentDue.toLocaleString("en-IN")}).
                  </p>
                  <p className="text-[11.5px] mt-1.5 text-amber-700 dark:text-amber-400">
                    {toOtherInvoices > 0 && toAdvanceBalance > 0
                      ? `₹${toOtherInvoices.toLocaleString("en-IN")} will clear older pending invoices and ₹${toAdvanceBalance.toLocaleString("en-IN")} will be credited to ${customer?.full_name || "the customer"}'s Advance Wallet.`
                      : toOtherInvoices > 0
                      ? `The extra ₹${toOtherInvoices.toLocaleString("en-IN")} will automatically clear ${simulatedAllocation.length} older pending invoice(s) (FIFO).`
                      : `The extra ₹${toAdvanceBalance.toLocaleString("en-IN")} will be credited to ${customer?.full_name || "the customer"}'s Advance Wallet for upcoming invoices.`}
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

              <div className="p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-ink-base dark:text-slate-100 block">
                      This Invoice (#{invoice?.invoice_number})
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-slate-400">
                      Remaining due will become ₹0.00
                    </span>
                  </div>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{paymentForCurrent.toLocaleString("en-IN")} ➔ PAID
                </span>
              </div>

              {toOtherInvoices > 0 && (
                <div className="p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-ink-base dark:text-slate-100 block">
                        Cleared Across Other Bills ({simulatedAllocation.length})
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400">
                        Allocated to oldest unpaid bills first (FIFO)
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-sky-600 dark:text-sky-400">
                    ₹{toOtherInvoices.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {toAdvanceBalance > 0 && (
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
                    +₹{toAdvanceBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>

            {/* Quick list of other invoices getting cleared */}
            {simulatedAllocation.length > 0 && (
              <div className="bg-gray-50 dark:bg-dark-subtle/50 rounded-xl p-3 border border-gray-200/80 dark:border-dark-border text-xs space-y-1.5">
                <span className="font-semibold text-gray-700 dark:text-slate-300 block mb-1">
                  Invoices Receiving Payment:
                </span>
                {simulatedAllocation.map((b) => (
                  <div key={b._id} className="flex justify-between items-center text-[11.5px]">
                    <span className="font-mono text-gray-600 dark:text-slate-300">
                      {b.invoice_number} ({formatDate(b.invoice_date || b.createdAt)})
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
              {currentDue > 0 && excessAmount > 0
                ? "Review Excess Allocation"
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
