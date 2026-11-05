import React, { useState, useMemo } from "react";
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
  Coins,
  Receipt,
  Wallet,
  Smartphone,
  MessageSquare,
  Hash,
  Check,
} from "lucide-react";

const generateIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "idem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
};

/**
 * Universal CustomerPaymentModal
 * Outer component handles open/closed mount lifecycle
 */
export default function CustomerPaymentModal(props) {
  if (!props.isOpen) return null;
  return <CustomerPaymentModalContent {...props} />;
}

function CustomerPaymentModalContent({
  isOpen,
  onClose,
  customer = {},
  ledgerSummary = {},
  invoices = [],
  ledgerEntries = [],
  onRecordPayment,
  isLoading = false,
  initialMode = "AUTO_FIFO",
}) {
  // Normalize unpaid invoices sorted chronologically (FIFO - oldest date first)
  const unpaidInvoices = useMemo(() => {
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
          if (Array.isArray(inv.invoice_items) && inv.invoice_items.length > 0) {
            itemsSummary = inv.invoice_items.map((s) => s.product_name).join(", ");
          } else if (Array.isArray(inv.services) && inv.services.length > 0) {
            itemsSummary = inv.services.map((s) => s.product_name).join(", ");
          }
          return {
            _id: String(inv._id),
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

    if (Array.isArray(ledgerEntries) && ledgerEntries.length > 0) {
      return ledgerEntries
        .filter((e) => (e.invoice_balance || 0) > 0 && !e.is_advance)
        .map((e) => ({
          _id: String(e._id),
          invoice_number: e.invoice_number,
          invoice_date: e.invoice_date,
          total_amount: Number(e.debit || 0),
          amount_paid: Number(e.credit || 0),
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

  // Total customer dues
  const totalDue = useMemo(() => {
    if (ledgerSummary?.total_due !== undefined && Number(ledgerSummary.total_due) > 0) {
      return Number(ledgerSummary.total_due);
    }
    return unpaidInvoices.reduce((sum, inv) => sum + inv.netDue, 0);
  }, [ledgerSummary, unpaidInvoices]);

  const advanceBalance = Number(customer?.advance_balance || 0);

  // Default mode computed during initialization
  const defaultMode = initialMode || (totalDue > 0 ? "AUTO_FIFO" : "ADVANCE_ONLY");
  const [allocationMode, setAllocationMode] = useState(defaultMode);
  const [paymentAmount, setPaymentAmount] = useState(() =>
    defaultMode === "ADVANCE_ONLY" ? "" : totalDue > 0 ? String(totalDue) : ""
  );
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [manualAllocations, setManualAllocations] = useState(() => {
    const initialManual = {};
    unpaidInvoices.forEach((inv) => {
      initialManual[inv._id] = 0;
    });
    return initialManual;
  });
  const [idempotencyKey] = useState(() => generateIdempotencyKey());
  const [showConfirmation, setShowConfirmation] = useState(false);

  const numEntered = parseFloat(paymentAmount) || 0;

  // Real-time calculation based on mode
  const { appliedToBills, excessToAdvance, simulatedAllocation } = useMemo(() => {
    if (allocationMode === "ADVANCE_ONLY") {
      return {
        appliedToBills: 0,
        excessToAdvance: numEntered,
        simulatedAllocation: [],
      };
    }

    if (allocationMode === "MANUAL") {
      let totalManual = 0;
      const list = [];
      for (const inv of unpaidInvoices) {
        const allocated = Math.min(
          Number(manualAllocations[inv._id] || 0),
          inv.netDue
        );
        if (allocated > 0) {
          totalManual += allocated;
          list.push({
            ...inv,
            allocated,
            remainingDueAfter: Math.max(0, inv.netDue - allocated),
            statusAfter: inv.netDue - allocated <= 0 ? "PAID" : "PARTIAL",
          });
        }
      }
      const excess = Math.max(0, numEntered - totalManual);
      return {
        appliedToBills: totalManual,
        excessToAdvance: excess,
        simulatedAllocation: list,
      };
    }

    // AUTO_FIFO
    let rem = numEntered;
    const list = [];
    let totalApplied = 0;
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
      totalApplied += alloc;
      rem -= alloc;
    }
    const excess = Math.max(0, numEntered - totalApplied);
    return {
      appliedToBills: totalApplied,
      excessToAdvance: excess,
      simulatedAllocation: list,
    };
  }, [allocationMode, numEntered, unpaidInvoices, manualAllocations]);

  const handleManualAllocationChange = (invId, value) => {
    const val = Math.max(0, parseFloat(value) || 0);
    const updated = { ...manualAllocations, [invId]: val };
    setManualAllocations(updated);

    // Automatically sync total paymentAmount with sum of manual allocations
    const sum = Object.values(updated).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
    setPaymentAmount(String(sum));
  };

  const handleManualSelectAll = () => {
    const updated = {};
    let sum = 0;
    unpaidInvoices.forEach((inv) => {
      updated[inv._id] = inv.netDue;
      sum += inv.netDue;
    });
    setManualAllocations(updated);
    setPaymentAmount(String(sum));
  };

  const handleManualClearAll = () => {
    const updated = {};
    unpaidInvoices.forEach((inv) => {
      updated[inv._id] = 0;
    });
    setManualAllocations(updated);
    setPaymentAmount("");
  };

  const handleInitialSubmit = (e) => {
    e?.preventDefault();
    if (!numEntered || numEntered <= 0) return;

    if (allocationMode === "AUTO_FIFO" && totalDue > 0 && excessToAdvance > 0) {
      setShowConfirmation(true);
    } else {
      executeRecord();
    }
  };

  const executeRecord = () => {
    if (!onRecordPayment) return;

    const payload = {
      amount: numEntered,
      payment_method: paymentMethod,
      payment_mode: paymentMethod,
      payment_date: paymentDate,
      transaction_reference: transactionReference,
      notes: paymentNotes,
      send_whatsapp: sendWhatsapp,
      allocation_mode: allocationMode,
      idempotency_key: idempotencyKey,
    };

    if (allocationMode === "MANUAL") {
      payload.allocations = Object.entries(manualAllocations)
        .filter(([, amt]) => Number(amt) > 0)
        .map(([invId, amt]) => ({
          invoice_id: invId,
          amount_applied: Number(amt),
        }));
    }

    onRecordPayment(payload);
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
  ];

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="lg" className="sm:max-w-xl">
      {/* Header */}
      <DialogHeader onClose={onClose} className="py-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
            <Coins className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink-base dark:text-slate-100 leading-tight">
              {showConfirmation
                ? "Confirm Advance Allocation"
                : allocationMode === "ADVANCE_ONLY"
                ? "Add Customer Advance Deposit"
                : "Receive Customer Payment"}
            </h2>
            <p className="text-xs text-ink-secondary dark:text-slate-400">
              {allocationMode === "ADVANCE_ONLY"
                ? "Credit customer wallet for future billing"
                : allocationMode === "MANUAL"
                ? "Select specific invoices and custom amounts"
                : "Auto-distribute lump sum across unpaid invoices (FIFO)"}
            </p>
          </div>
        </div>
      </DialogHeader>

      <DialogBody className="p-4 sm:p-6 max-h-[78vh] overflow-y-auto overscroll-contain">
        {!showConfirmation ? (
          <form onSubmit={handleInitialSubmit} className="space-y-4">
            {/* Customer & Dues Summary Bar */}
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3 space-y-2.5 shadow-xs">
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                    <Wallet className="w-3.5 h-3.5" />
                    Adv: ₹{advanceBalance.toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              {/* Dues Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-blue-100 dark:border-blue-900/40 text-center">
                <div className="bg-white/80 dark:bg-dark-card/80 p-2 rounded-lg border border-gray-100 dark:border-dark-border">
                  <span className="block text-[10px] text-gray-500 dark:text-slate-400">
                    Total Invoiced
                  </span>
                  <span className="font-bold text-xs text-gray-800 dark:text-slate-200">
                    ₹{Number(ledgerSummary?.total_invoiced || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-dark-card/80 p-2 rounded-lg border border-gray-100 dark:border-dark-border">
                  <span className="block text-[10px] text-gray-500 dark:text-slate-400">
                    Total Settled
                  </span>
                  <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    ₹{Number(ledgerSummary?.total_paid || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-dark-card/80 p-2 rounded-lg border border-gray-100 dark:border-dark-border col-span-2 sm:col-span-1">
                  <span className="block text-[10px] text-gray-500 dark:text-slate-400">
                    Current Dues
                  </span>
                  <span className="font-bold text-xs text-amber-600 dark:text-amber-400">
                    ₹{totalDue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Mode Selection Tabs */}
            <div className="flex bg-gray-100 dark:bg-dark-subtle p-1 rounded-xl gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAllocationMode("AUTO_FIFO");
                  if (!paymentAmount && totalDue > 0) setPaymentAmount(String(totalDue));
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
                  allocationMode === "AUTO_FIFO"
                    ? "bg-white dark:bg-dark-card text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
                }`}
              >
                Auto Settle (FIFO)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAllocationMode("MANUAL");
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
                  allocationMode === "MANUAL"
                    ? "bg-white dark:bg-dark-card text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
                }`}
              >
                Select Invoices
              </button>
              <button
                type="button"
                onClick={() => {
                  setAllocationMode("ADVANCE_ONLY");
                  setPaymentAmount("");
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
                  allocationMode === "ADVANCE_ONLY"
                    ? "bg-white dark:bg-dark-card text-purple-600 dark:text-purple-400 shadow-xs"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
                }`}
              >
                Advance Wallet Only
              </button>
            </div>

            {/* Manual Invoice Allocation List */}
            {allocationMode === "MANUAL" && (
              <div className="border border-gray-200 dark:border-dark-border rounded-xl p-3 bg-gray-50/50 dark:bg-dark-subtle/30 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700 dark:text-slate-300">
                    Open Invoices ({unpaidInvoices.length})
                  </span>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleManualSelectAll}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      Select All
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={handleManualClearAll}
                      className="text-gray-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {unpaidInvoices.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">
                    No unpaid invoices found. Use Advance Wallet mode to record a credit.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {unpaidInvoices.map((inv) => {
                      const currentAlloc = manualAllocations[inv._id] || 0;
                      const isSelected = currentAlloc > 0;
                      return (
                        <div
                          key={inv._id}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${
                            isSelected
                              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800"
                              : "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 dark:text-white">
                                {inv.invoice_number}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                ({formatDate(inv.invoice_date)})
                              </span>
                            </div>
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              Due: ₹{inv.netDue.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-gray-500 font-semibold">₹</span>
                            <input
                              type="number"
                              min="0"
                              max={inv.netDue}
                              step="any"
                              value={manualAllocations[inv._id] || ""}
                              placeholder="0"
                              onChange={(e) =>
                                handleManualAllocationChange(inv._id, e.target.value)
                              }
                              className="w-24 px-2 py-1 border border-gray-200 dark:border-dark-border rounded-md text-right text-xs font-bold bg-white dark:bg-dark-input text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleManualAllocationChange(
                                  inv._id,
                                  currentAlloc === inv.netDue ? 0 : inv.netDue
                                )
                              }
                              className={`p-1 rounded text-[10px] font-bold ${
                                currentAlloc === inv.netDue
                                  ? "bg-emerald-600 text-white"
                                  : "bg-gray-100 dark:bg-dark-subtle text-gray-700 dark:text-slate-300"
                              }`}
                              title="Toggle Full Settle"
                            >
                              Full
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Total Amount Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-200">
                  Amount Received (₹) <span className="text-red-500">*</span>
                </label>
                {totalDue > 0 && allocationMode !== "MANUAL" && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(totalDue))}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Set Full Due (₹{totalDue.toLocaleString("en-IN")})
                  </button>
                )}
              </div>

              <div className="relative rounded-xl shadow-2xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold text-base">
                  ₹
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="0.00"
                  disabled={allocationMode === "MANUAL"}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 text-base sm:text-lg font-bold rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-input text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-dark-subtle"
                />
              </div>

              {/* Quick Add Pills */}
              {allocationMode !== "MANUAL" && (
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-xs">
                  <span className="text-[10px] text-gray-400 shrink-0">Quick Add:</span>
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAdd(amt)}
                      className="px-2 py-0.5 rounded-full font-medium text-[11px] bg-gray-100 hover:bg-gray-200 dark:bg-dark-subtle dark:hover:bg-dark-card text-gray-700 dark:text-slate-300 transition-colors shrink-0"
                    >
                      +₹{amt.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-200">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {paymentModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMethod(mode.id)}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition-all ${
                      paymentMethod === mode.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-white dark:bg-dark-card text-gray-700 dark:text-slate-300 border-gray-200 dark:border-dark-border hover:bg-gray-50"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Transaction Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-200">
                  Payment Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-200">
                  Ref / UTR / Cheque #
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. UPI 4123891823"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-200">
                Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Received via phonepe counter QR"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* WhatsApp Receipt Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Send WhatsApp Receipt Confirmation
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWhatsapp}
                  onChange={(e) => setSendWhatsapp(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Live Distribution Preview Card */}
            {numEntered > 0 && (
              <div className="bg-slate-50 dark:bg-dark-card/90 border border-slate-200 dark:border-dark-border rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-gray-700 dark:text-slate-300">
                  <span>Allocation Breakdown</span>
                  <span className="text-blue-600 font-mono">Total: ₹{numEntered.toLocaleString("en-IN")}</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-gray-600 dark:text-slate-400">
                    <span>Applied to Invoices:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{appliedToBills.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {excessToAdvance > 0 && (
                    <div className="flex justify-between text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 p-1.5 rounded-lg border border-purple-200 dark:border-purple-800">
                      <span>Credited to Advance Wallet:</span>
                      <span>+₹{excessToAdvance.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-dark-border font-bold">
                    <span>Remaining Customer Dues:</span>
                    <span className="text-amber-600 dark:text-amber-400">
                      ₹{Math.max(0, totalDue - appliedToBills).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {simulatedAllocation.length > 0 && allocationMode === "AUTO_FIFO" && (
                    <div className="pt-2 border-t border-gray-200 dark:border-dark-border space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        Invoices Settling ({simulatedAllocation.length}):
                      </span>
                      {simulatedAllocation.map((item) => (
                        <div key={item._id} className="flex justify-between text-[11px]">
                          <span className="text-gray-700 dark:text-slate-300">
                            {item.invoice_number} ({item.statusAfter})
                          </span>
                          <span className="font-bold text-emerald-600">
                            ₹{item.allocated.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        ) : (
          /* Confirmation Screen when payment exceeds dues */
          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Excess Payment Confirmation</p>
                <p className="mt-1">
                  Customer owes <strong>₹{totalDue.toLocaleString("en-IN")}</strong>. You are receiving <strong>₹{numEntered.toLocaleString("en-IN")}</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">All pending invoices settled:</span>
                <span className="font-bold text-emerald-600">₹{appliedToBills.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-bold text-purple-700 dark:text-purple-300">
                <span>Credit to Advance Wallet:</span>
                <span>+₹{excessToAdvance.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-gray-100 dark:border-dark-border text-gray-700 dark:text-slate-300">
                <span>New Advance Balance:</span>
                <span className="font-bold">₹{(advanceBalance + excessToAdvance).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
              The excess will be safely stored in the customer's wallet and can be applied to future invoices.
            </p>
          </div>
        )}
      </DialogBody>

      <DialogFooter className="py-3 px-4 sm:px-6 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-dark-border">
        {showConfirmation ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
            >
              Back to Edit
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={executeRecord}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
            >
              {isLoading ? (
                <>Recording...</>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Confirm & Credit Wallet
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleInitialSubmit}
              disabled={isLoading || !numEntered || numEntered <= 0}
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
            >
              {isLoading ? (
                <>Processing...</>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  {allocationMode === "ADVANCE_ONLY"
                    ? `Add ₹${numEntered > 0 ? numEntered.toLocaleString("en-IN") : "0"} to Wallet`
                    : `Receive ₹${numEntered > 0 ? numEntered.toLocaleString("en-IN") : "0"}`}
                </>
              )}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}
