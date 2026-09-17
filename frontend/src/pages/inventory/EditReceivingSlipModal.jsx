import React, { useState, useEffect, useRef } from "react";
import {
  X,
  FileSpreadsheet,
  Building2,
  Calendar,
  ImagePlus,
  Camera,
  Trash2,
  AlertCircle,
  Package,
} from "lucide-react";
import { useGetDealersQuery } from "../../features/dealers/dealerApi.js";
import { useUpdateReceivingSlipMutation } from "../../features/inventory/inventoryApi.js";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
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

const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
};

const EditReceivingSlipModal = ({
  isOpen,
  onClose,
  slip,
  rows = [],
  onSuccess,
}) => {
  const { data: dealersData } = useGetDealersQuery(undefined, { skip: !isOpen });
  const [updateReceivingSlip, { isLoading: isSubmitting }] = useUpdateReceivingSlipMutation();

  const dealers = dealersData?.dealers || [];

  const [dealerId, setDealerId] = useState("");
  const [dealerInvoiceNo, setDealerInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [purchaseBillImages, setPurchaseBillImages] = useState([]);
  const [rowPrices, setRowPrices] = useState({});
  const [rowNames, setRowNames] = useState({});
  const [photosOpen, setPhotosOpen] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && slip) {
      setDealerId(slip.dealer?._id || slip.dealer || "");
      setDealerInvoiceNo(slip.dealer_invoice_no || "");
      if (slip.purchase_date) {
        const d = new Date(slip.purchase_date);
        setPurchaseDate(!isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "");
      } else {
        setPurchaseDate("");
      }
      setNotes(slip.notes || "");

      const initialImgs = [
        slip.purchase_bill_image,
        ...(Array.isArray(slip.purchase_bill_images) ? slip.purchase_bill_images : []),
      ].filter((img, idx, arr) => Boolean(img) && arr.indexOf(img) === idx);
      setPurchaseBillImages(initialImgs);

      // Initialize row prices and names
      const initialPrices = {};
      const initialNames = {};
      rows.forEach((r, idx) => {
        const prodId = r.product_id?._id || r.product_id || r._id || idx;
        if (prodId) {
          initialPrices[prodId] = r.purchase_price !== undefined ? r.purchase_price : "";
          initialNames[prodId] = r.product_name || "";
        }
      });
      setRowPrices(initialPrices);
      setRowNames(initialNames);
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, slip, rows]);

  if (!isOpen || !slip) return null;

  const handlePriceChange = (prodId, val) => {
    setRowPrices((prev) => ({
      ...prev,
      [prodId]: val,
    }));
  };

  const handleNameChange = (prodId, val) => {
    setRowNames((prev) => ({
      ...prev,
      [prodId]: val,
    }));
  };

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

      const res = await fetch(`${API_BASE_URL}/files/product-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.message || "Failed to upload image");
      }

      let newUrls = [];
      if (Array.isArray(resData.data?.images)) {
        newUrls = resData.data.images.map((img) => img.image_url).filter(Boolean);
      } else if (Array.isArray(resData.data)) {
        newUrls = resData.data.map((img) => (typeof img === "string" ? img : img.image_url)).filter(Boolean);
      } else if (resData.data?.image_url) {
        newUrls = [resData.data.image_url];
      }

      if (newUrls.length > 0) {
        setPurchaseBillImages((prev) => [...prev, ...newUrls]);
      } else {
        throw new Error("No image URLs returned from server");
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      setImageError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setPurchaseBillImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!dealerId) {
      setErrorMsg("Please select a supplier / dealer.");
      return;
    }

    if (!dealerInvoiceNo.trim()) {
      setErrorMsg("Please enter a dealer invoice / bill reference number.");
      return;
    }

    try {
      const slipIdentifier = slip._id || slip.dealer_invoice_no;
      const res = await updateReceivingSlip({
        id: slipIdentifier,
        dealer_id: dealerId,
        dealer_invoice_no: dealerInvoiceNo.trim().toUpperCase(),
        purchase_date: purchaseDate || new Date().toISOString(),
        purchase_bill_image: purchaseBillImages[0] || "",
        purchase_bill_images: purchaseBillImages,
        notes: notes.trim(),
        row_prices: rowPrices,
        row_names: rowNames,
      }).unwrap();

      setSuccessMsg(res.message || "Receiving slip updated successfully!");
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setErrorMsg(err?.data?.message || err.message || "Failed to update receiving slip.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-indigo-50/40 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Edit Receiving Slip #{slip.dealer_invoice_no}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Update supplier, invoice reference, batch prices, and attached bill photos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              {successMsg}
            </div>
          )}

          {/* Supplier & Invoice Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Supplier / Dealer <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={dealerId}
                  onChange={(e) => setDealerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Supplier</option>
                  {dealers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} {d.phone ? `(${d.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Supplier Invoice / Bill No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dealerInvoiceNo}
                onChange={(e) => setDealerInvoiceNo(e.target.value)}
                placeholder="e.g. INV-8890"
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-bg text-gray-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Purchase Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Intake / Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Slip Notes / Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Received via BlueDart courier..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Batch Products Price & Name Review */}
          {rows.length > 0 && (
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Batch Products in Slip:
              </label>
              <div className="border border-gray-200 dark:border-dark-border rounded-xl divide-y divide-gray-100 dark:divide-dark-border overflow-hidden bg-gray-50/50 dark:bg-dark-bg/40">
                {rows.map((row, idx) => {
                  const prodId = row.product_id?._id || row.product_id || row._id || idx;
                  const currentPrice = rowPrices[prodId] !== undefined ? rowPrices[prodId] : row.purchase_price;
                  const currentName = rowNames[prodId] !== undefined ? rowNames[prodId] : (row.product_name || "");

                  return (
                    <div key={prodId || idx} className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <input
                            type="text"
                            value={currentName}
                            onChange={(e) => handleNameChange(prodId, e.target.value)}
                            placeholder="Product Name"
                            className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                          />
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {row.quantity} unit(s) in this batch {row.company ? `· ${row.company}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <span className="text-gray-500 text-[11px]">Unit Price ₹</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={currentPrice}
                          onChange={(e) => handlePriceChange(prodId, e.target.value)}
                          className="w-24 px-2 py-1 text-xs font-bold font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-right"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attached Bill Photos Section */}
          <div className="pt-2">
            <div className="bg-gray-50 dark:bg-dark-bg/60 border border-gray-200 dark:border-dark-border rounded-xl p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                  <ImagePlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Purchase Bill / Invoice Photos</span>
                  {purchaseBillImages.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold">
                      {purchaseBillImages.length}
                    </span>
                  )}
                </div>
              </div>

              {imageError && (
                <div className="p-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs rounded-md">
                  {imageError}
                </div>
              )}

              {/* Photo Thumbnails Strip */}
              <div className="flex flex-wrap gap-2.5 items-center">
                {purchaseBillImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group bg-black"
                  >
                    <img
                      src={imgUrl}
                      alt={`Bill Preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-0.5 right-0.5 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity shadow-xs"
                      title="Remove image"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}

                {/* Upload Action Buttons */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="h-14 px-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-400 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:text-purple-600 transition-colors bg-white dark:bg-dark-card"
                >
                  {imageUploading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <ImagePlus className="w-4 h-4 text-gray-400" />
                      <span>Upload</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={imageUploading}
                  className="h-14 px-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-400 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:text-purple-600 transition-colors bg-white dark:bg-dark-card"
                >
                  <Camera className="w-4 h-4 text-gray-400" />
                  <span>Camera</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting || imageUploading}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReceivingSlipModal;
