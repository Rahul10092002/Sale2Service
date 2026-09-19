import React, { useState, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  FileSpreadsheet,
  Building2,
  Package,
  ScanLine,
  ImagePlus,
  Camera,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useGetDealersQuery } from "../../features/dealers/dealerApi.js";
import { useCreateReceivingSlipMutation } from "../../features/inventory/inventoryApi.js";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
import SerialScanner from "../../components/invoice/SerialScanner.jsx";
import { getToken } from "../../utils/token.js";

const API_BASE_URL =
  import.meta.env.VITE_ENVIRONMENT === "production"
    ? import.meta.env.VITE_PROD_API_URL
    : import.meta.env.VITE_LOCAL_API_URL;

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const MAX_PX = 1200;
    const QUALITY = 0.8;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(MAX_PX / img.width, MAX_PX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas compression failed"));
        },
        "image/jpeg",
        QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };
    img.src = objectUrl;
  });

const ReceivingSlipModal = ({ isOpen, onClose, onOpenDealers }) => {
  const { data: dealersData } = useGetDealersQuery(undefined, { skip: !isOpen });
  const [createReceivingSlip, { isLoading: isSubmitting }] = useCreateReceivingSlipMutation();

  const dealers = dealersData?.dealers || [];

  const [dealerId, setDealerId] = useState("");
  const [dealerInvoiceNo, setDealerInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Photos Tray & Image State (matching ProductCard.jsx)
  const [photosOpen, setPhotosOpen] = useState(true);
  const [purchaseBillImages, setPurchaseBillImages] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState(null);

  // Scanner state: stores index of active row being scanned, or null
  const [activeScannerRowIndex, setActiveScannerRowIndex] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [rows, setRows] = useState([
    { product_name: "", purchase_price: "", raw_serials: "" },
  ]);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows([...rows, { product_name: "", purchase_price: "", raw_serials: "" }]);
  };

  const handleRemoveRow = (index) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const handleScanSuccess = (scannedCode) => {
    if (activeScannerRowIndex !== null && activeScannerRowIndex < rows.length) {
      const updated = [...rows];
      const currentVal = updated[activeScannerRowIndex].raw_serials.trim();
      if (currentVal) {
        updated[activeScannerRowIndex].raw_serials = `${currentVal}, ${scannedCode}`;
      } else {
        updated[activeScannerRowIndex].raw_serials = scannedCode;
      }
      setRows(updated);
    }
    setActiveScannerRowIndex(null);
  };

  // Image change handler matching ProductCard.jsx
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageError(null);
    setImageUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        const compressed = await compressImage(file);
        formData.append("product_images", compressed, "bill_document.jpg");
      }

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/files/product-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || "Failed to upload image");
      }

      // Correctly extract image URLs from json.data.images or fallback formats
      const newUrls =
        json.data?.images?.map((img) => img.image_url) ||
        (Array.isArray(json.data) ? json.data.map((img) => img.image_url) : [json.data?.image_url || json.image_url].filter(Boolean));

      if (!newUrls || newUrls.length === 0) {
        throw new Error("No image URLs returned from upload server.");
      }

      setPurchaseBillImages((prev) => [...prev, ...newUrls]);
    } catch (err) {
      console.error("Receiving slip image upload error:", err);
      setImageError(err.message || "Image upload failed");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const removeImage = (urlToRemove) => {
    setPurchaseBillImages((prev) => prev.filter((url) => url !== urlToRemove));
    setImageError(null);
  };

  const parseSerials = (rawText) => {
    if (!rawText) return [];
    return rawText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const calculateTotals = () => {
    let totalItems = 0;
    let totalCost = 0;

    rows.forEach((r) => {
      const serials = parseSerials(r.raw_serials);
      const count = serials.length > 0 ? serials.length : 1;
      totalItems += count;
      totalCost += (Number(r.purchase_price) || 0) * count;
    });

    return { totalItems, totalCost };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!dealerId) {
      setErrorMsg("Please select a Dealer.");
      return;
    }

    const formattedItems = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.product_name || !r.product_name.trim()) {
        setErrorMsg(`Row #${i + 1}: Please enter a Product Name.`);
        return;
      }
      const serials = parseSerials(r.raw_serials);
      formattedItems.push({
        product_name: r.product_name.trim(),
        purchase_price: Number(r.purchase_price) || 0,
        serial_numbers: serials,
      });
    }

    try {
      const res = await createReceivingSlip({
        dealer_id: dealerId,
        dealer_invoice_no: dealerInvoiceNo,
        purchase_date: purchaseDate,
        purchase_bill_image: purchaseBillImages[0] || "",
        purchase_bill_images: purchaseBillImages,
        notes,
        items: formattedItems,
      }).unwrap();

      setSuccessMsg(res.message || "Receiving Slip intake created successfully!");
      setTimeout(() => {
        onClose();
        setSuccessMsg("");
        setPurchaseBillImages([]);
        setRows([{ product_name: "", purchase_price: "", raw_serials: "" }]);
      }, 1500);
    } catch (err) {
      setErrorMsg(err?.data?.message || "Failed to process stock intake.");
    }
  };

  const totals = calculateTotals();

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] sm:max-h-[92vh] flex flex-col border border-gray-200 dark:border-gray-700">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  Log Receiving Slip (Stock Intake)
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                  Bulk intake multiple inventory units from a supplier invoice
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs sm:text-sm rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm rounded-xl font-medium">
                {successMsg}
              </div>
            )}

            {/* Top Row: Dealer, Invoice No, Purchase Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 bg-gray-50/70 dark:bg-gray-900/30 p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Supplier / Dealer <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={onOpenDealers}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add Supplier
                  </button>
                </div>
                <select
                  required
                  value={dealerId}
                  onChange={(e) => setDealerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Select Supplier --</option>
                  {dealers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} {d.phone ? `(${d.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Dealer Bill / Invoice #
                </label>
                <input
                  type="text"
                  value={dealerInvoiceNo}
                  onChange={(e) => setDealerInvoiceNo(e.target.value)}
                  placeholder="e.g. INV-DEALER-9921"
                  className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white uppercase font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* ── Photos Tray Matching ProductCard.jsx (L683-L783) ── */}
            <div className="rounded-lg border border-gray-200 dark:border-dark-border/70 overflow-hidden bg-gray-50/50 dark:bg-dark-bg/40">
              <button
                type="button"
                id="receiving-slip-photos-tray"
                aria-expanded={photosOpen}
                onClick={() => setPhotosOpen(!photosOpen)}
                className="w-full flex items-center justify-between p-2.5 sm:px-3 text-left hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ImagePlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                    Purchase Bill / Invoice Attachment
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200/80 dark:bg-dark-hover text-gray-700 dark:text-slate-300">
                    Photos ({purchaseBillImages.length})
                  </span>
                </div>
                {photosOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </button>

              {photosOpen && (
                <div className="p-2.5 sm:p-3 pt-1 border-t border-gray-100 dark:border-dark-border/50 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {purchaseBillImages.map((url, idx) => (
                      <div key={idx} className="relative inline-block">
                        <img
                          src={url}
                          alt={`Bill Document ${idx + 1}`}
                          className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-dark-border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(url)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-xs hover:bg-red-600"
                          title="Remove photo"
                          aria-label={`Remove photo ${idx + 1}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* Upload Button */}
                    <label className="flex flex-col items-center justify-center min-w-[56px] h-14 px-2 border border-dashed border-gray-300 dark:border-dark-border rounded-lg cursor-pointer hover:bg-gray-100/60 dark:hover:bg-dark-hover active:scale-95 transition">
                      {imageUploading ? (
                        <span className="text-[9px] text-indigo-600 font-bold">Uploading…</span>
                      ) : (
                        <>
                          <ImagePlus className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                          <span className="text-[10px] font-semibold text-gray-600 dark:text-slate-300 mt-0.5">
                            Upload
                          </span>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={imageUploading}
                        onChange={handleImageChange}
                      />
                    </label>

                    {/* Camera Button */}
                    <label className="flex flex-col items-center justify-center min-w-[56px] h-14 px-2 border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-lg cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 active:scale-95 transition">
                      {imageUploading ? (
                        <span className="text-[9px] text-emerald-600 font-bold">Uploading…</span>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
                            Camera
                          </span>
                        </>
                      )}
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        className="hidden"
                        disabled={imageUploading}
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>

                  {imageError && (
                    <p className="text-[11px] text-red-600 font-medium">{imageError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Dynamic Receiving Items Table / Mobile Cards */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" /> Received Items List
                </h3>
                <span className="text-[11px] text-gray-500 hidden sm:inline">
                  Scan barcode with camera or paste serials
                </span>
              </div>

              {/* MOBILE ITEM CARDS (< md screens) */}
              <div className="block md:hidden space-y-3">
                {rows.map((row, idx) => {
                  const parsedCount = parseSerials(row.raw_serials).length;
                  return (
                    <div
                      key={idx}
                      className="bg-white dark:bg-gray-900 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3"
                    >
                      <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          Item #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={rows.length === 1}
                          className="text-xs text-red-500 hover:text-red-600 font-semibold disabled:opacity-30 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>

                      {/* Product Name Input */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={row.product_name}
                          onChange={(e) => handleRowChange(idx, "product_name", e.target.value)}
                          placeholder="Type product name (e.g. iPhone 15 Pro, HP Laptop)"
                          className="w-full px-2.5 py-1.5 text-xs border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      {/* Purchase Price & Unit Count */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            Unit Cost (₹) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="any"
                            value={row.purchase_price}
                            onChange={(e) => handleRowChange(idx, "purchase_price", e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2.5 py-1.5 text-xs border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            Subtotal (₹)
                          </label>
                          <div className="px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                            ₹{((Number(row.purchase_price) || 0) * (parsedCount > 0 ? parsedCount : 1)).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Serial Numbers Textarea with Integrated Scanner */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                            Serial Numbers ({parsedCount} unit{parsedCount === 1 ? "" : "s"})
                          </label>
                          <button
                            type="button"
                            onClick={() => setActiveScannerRowIndex(idx)}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md"
                          >
                            <ScanLine className="w-3.5 h-3.5" /> Scan Barcode
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={row.raw_serials}
                          onChange={(e) => handleRowChange(idx, "raw_serials", e.target.value)}
                          placeholder="Paste serial numbers separated by comma or new line (e.g. SN1001, SN1002)..."
                          className="w-full px-2.5 py-1.5 text-xs font-mono border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white uppercase focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP ITEMS TABLE (≥ md screens) */}
              <div className="hidden md:block overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                <table className="w-full text-left text-xs text-gray-700 dark:text-gray-200">
                  <thead className="bg-gray-100 dark:bg-gray-900/80 uppercase font-semibold text-gray-600 dark:text-gray-400">
                    <tr>
                      <th className="p-3 w-8">#</th>
                      <th className="p-3 w-[30%]">Product Name</th>
                      <th className="p-3 w-[15%]">Purchase Price (₹)</th>
                      <th className="p-3 w-[45%]">Serial Numbers (Comma / Line-separated)</th>
                      <th className="p-3 text-right w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {rows.map((row, idx) => {
                      const parsedCount = parseSerials(row.raw_serials).length;
                      return (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="p-3 font-bold text-gray-400">{idx + 1}</td>

                          {/* Product Name Input */}
                          <td className="p-3">
                            <input
                              type="text"
                              required
                              value={row.product_name}
                              onChange={(e) => handleRowChange(idx, "product_name", e.target.value)}
                              placeholder="Type product name (e.g. iPhone 15 Pro, HP Laptop)"
                              className="w-full px-2.5 py-1.5 border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </td>

                          {/* Purchase Price */}
                          <td className="p-3">
                            <input
                              type="number"
                              required
                              min="0"
                              step="any"
                              value={row.purchase_price}
                              onChange={(e) => handleRowChange(idx, "purchase_price", e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2.5 py-1.5 font-bold border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </td>

                          {/* Serial Numbers & Live Scanner Trigger */}
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[10px] text-gray-400">
                                <span>
                                  Count: <strong className="text-indigo-600 dark:text-indigo-400">{parsedCount || 1}</strong> unit(s)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveScannerRowIndex(idx)}
                                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded"
                                >
                                  <ScanLine className="w-3 h-3" /> Camera Scan
                                </button>
                              </div>
                              <textarea
                                rows={2}
                                value={row.raw_serials}
                                onChange={(e) => handleRowChange(idx, "raw_serials", e.target.value)}
                                placeholder="Paste or type serial numbers (e.g. SN001, SN002)..."
                                className="w-full px-2 py-1 font-mono text-[11px] border rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white uppercase"
                              />
                            </div>
                          </td>

                          {/* Remove Row */}
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              disabled={rows.length === 1}
                              className="p-1 text-red-500 hover:text-red-700 disabled:opacity-20 transition"
                              title="Delete Item Row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add New Item Row Button */}
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center gap-1.5 transition active:scale-98"
                >
                  <Plus className="w-4 h-4" /> Add Another Product Row
                </button>
              </div>
            </div>

            {/* Notes / Memo */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Receiving Slip Notes / Memo (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add supplier delivery memo, driver name, package tracking, etc."
                className="w-full px-3 py-2 text-xs sm:text-sm border rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </form>

          {/* Modal Footer Summary & Actions */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs sm:text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Total Units: <strong className="text-gray-900 dark:text-white font-bold">{totals.totalItems}</strong>
              </span>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <span className="text-gray-600 dark:text-gray-400">
                Total Cost:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm sm:text-base">
                  ₹{totals.totalCost.toFixed(2)}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial text-xs sm:text-sm py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting || imageUploading}
                className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm py-2 px-5"
              >
                Save & Intake Inventory
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Serial Scanner Modal Dialog */}
      {activeScannerRowIndex !== null && (
        <SerialScanner
          isOpen={true}
          onClose={() => setActiveScannerRowIndex(null)}
          onScan={handleScanSuccess}
          onScanSuccess={handleScanSuccess}
        />
      )}
    </>
  );
};

export default ReceivingSlipModal;
