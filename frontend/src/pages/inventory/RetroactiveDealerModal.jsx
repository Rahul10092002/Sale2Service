import React, { useState, useEffect } from "react";
import { X, Lock, ShieldCheck, Building2, Calendar, FileText, AlertCircle } from "lucide-react";
import { useGetDealersQuery } from "../../features/dealers/dealerApi.js";
import { useLinkRetroactiveDealerMutation } from "../../features/inventory/inventoryApi.js";
import { Button } from "../../components/ui/index.js";

const RetroactiveDealerModal = ({ isOpen, onClose, item }) => {
  const { data: dealersData } = useGetDealersQuery(undefined, { skip: !isOpen });
  const [linkDealer, { isLoading: isSubmitting }] = useLinkRetroactiveDealerMutation();

  const dealers = (dealersData?.dealers || []).filter(
    (d) => !d.deleted_at && !d.is_retired
  );

  const [dealerId, setDealerId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseInvoiceRef, setPurchaseInvoiceRef] = useState("");
  const [notes, setNotes] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (item) {
      setDealerId(item.dealer_id?._id || item.dealer_id || "");
      setSerialNumber(item.serial_number || "");
      setPurchaseDate(
        item.purchase_date
          ? new Date(item.purchase_date).toISOString().split("T")[0]
          : ""
      );
      setPurchaseInvoiceRef(item.purchase_invoice_ref || "");
      setNotes("");
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const isSoldOrInService = ["SOLD", "UNDER_SERVICE"].includes(item.status);
  const isSerialLocked = isSoldOrInService && Boolean(item.serial_number);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!dealerId) {
      setErrorMsg("Please select an Origin Supplier / Dealer.");
      return;
    }

    try {
      const targetId = item._id || item.inventory_item_id || item.id;
      const res = await linkDealer({
        itemId: targetId,
        dealer_id: dealerId,
        serial_number: isSerialLocked ? undefined : serialNumber,
        purchase_date: purchaseDate,
        purchase_invoice_ref: purchaseInvoiceRef,
        notes,
      }).unwrap();

      setSuccessMsg(res.message || "Origin supplier linked successfully!");
      setTimeout(() => {
        onClose();
        setSuccessMsg("");
      }, 1500);
    } catch (err) {
      setErrorMsg(err?.data?.message || "Failed to link retroactive dealer.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 rounded-t-2xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Edit Purchase Origin
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Link supplier details without altering invoice financials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-xl border border-green-200 dark:border-green-800">
              {successMsg}
            </div>
          )}

          {/* Sold Item Details Snapshot */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Product Name:</span>
              <strong className="text-gray-900 dark:text-white font-bold">{item.product_name}</strong>
            </div>
            {item.invoice && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Invoice Number:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{item.invoice.invoice_number}</span>
              </div>
            )}
            {item.invoice?.customer_name && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Customer:</span>
                <span className="text-gray-800 dark:text-gray-200 font-medium">{item.invoice.customer_name}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-500">Unit Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                item.status === 'SOLD'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}>
                {item.status || 'SOLD'}
              </span>
            </div>
          </div>

          {/* Serial Number (Locked if sold) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Serial Number
              </label>
              {isSerialLocked && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked (Item Sold)
                </span>
              )}
            </div>
            <input
              type="text"
              disabled={isSerialLocked}
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. SN-99991"
              className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl uppercase font-mono ${
                isSerialLocked
                  ? "bg-gray-100 dark:bg-gray-900 text-gray-500 border-gray-200 cursor-not-allowed"
                  : "border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
              }`}
            />
          </div>

          {/* Dealer Selection (Active Only) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Select Supplier / Dealer *
            </label>
            <select
              required
              value={dealerId}
              onChange={(e) => setDealerId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
            >
              <option value="">-- Choose Origin Dealer --</option>
              {dealers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Purchase Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Dealer Bill Ref #
              </label>
              <input
                type="text"
                value={purchaseInvoiceRef}
                onChange={(e) => setPurchaseInvoiceRef(e.target.value)}
                placeholder="e.g. BILL-992"
                className="w-full px-3 py-2 text-xs border rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white uppercase font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Audit Note / Reason
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Associated supplier origin for customer warranty claim"
              className="w-full px-3 py-2 text-xs border rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto min-h-[44px]">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Save Origin Association
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RetroactiveDealerModal;
