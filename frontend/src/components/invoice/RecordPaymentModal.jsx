import React, { useState, useEffect } from "react";
import {
  Modal as Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
} from "../ui/index.js";

/**
 * RecordPaymentModal allows entering and recording a full/partial payment for an invoice.
 */
export default function RecordPaymentModal({
  isOpen,
  onClose,
  invoice = {},
  onRecordPayment,
  isLoading = false,
}) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");

  useEffect(() => {
    if (isOpen && invoice) {
      setPaymentAmount(
        String(invoice.amount_due || invoice.total_amount || "")
      );
      setPaymentMode(invoice.payment_mode || "CASH");
    }
  }, [isOpen, invoice]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    onRecordPayment(amount, paymentMode);
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogHeader onClose={onClose}>Record Payment</DialogHeader>
      <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2.5 text-sm border border-gray-200 dark:border-dark-border">
            <div className="flex justify-between">
              <span className="text-ink-secondary dark:text-slate-400">
                Total Amount:
              </span>
              <span className="font-medium text-ink-base dark:text-slate-100">
                ₹{Number(invoice.total_amount || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-ink-secondary dark:text-slate-400">
                Already Paid:
              </span>
              <span className="font-medium text-green-700 dark:text-green-400">
                ₹{Number(invoice.amount_paid || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mt-1 border-t border-gray-200 dark:border-dark-border pt-1">
              <span className="text-ink-secondary dark:text-slate-300 font-medium">
                Amount Due:
              </span>
              <span className="font-bold text-red-600 dark:text-red-400">
                ₹{Number(invoice.amount_due || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              max={invoice.amount_due || invoice.total_amount}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter amount"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
              Payment Mode
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="MIXED">Mixed</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
        </form>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          className="ml-2"
          onClick={handleSubmit}
          disabled={
            isLoading ||
            !paymentAmount ||
            parseFloat(paymentAmount) <= 0
          }
        >
          {isLoading ? "Saving..." : "Record Payment"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
