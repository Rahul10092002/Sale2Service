import React, { useState, useRef, useCallback } from "react";
import {
  Wrench,
  Trash2,
  Copy,
  Shield,
  FileText,
  Camera,
  ImagePlus,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { INVOICE_CONSTANTS } from "../../utils/constants.js";
import { getToken } from "../../utils/token.js";

const API_BASE_URL =
  import.meta.env.VITE_ENVIRONMENT === "production"
    ? import.meta.env.VITE_PROD_API_URL
    : import.meta.env.VITE_LOCAL_API_URL;

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const MAX_PX = 900;
    const QUALITY = 0.78;
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
        QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });

const ServiceCard = React.memo(function ServiceCard({
  item,
  index,
  updateItem,
  updateItemImmediate,
  removeItem,
  duplicateItem,
  errors = {},
  recalculateInvoice,
}) {
  const [showPresets, setShowPresets] = useState(false);
  const [showCategoryPresets, setShowCategoryPresets] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(
    !!(item.warranty_duration_months > 0 || item.notes || (item.product_images && item.product_images.length > 0))
  );

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const numVal = (value, fallback = "") =>
    value !== undefined && value !== null ? value : fallback;

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageError(null);
    setImageUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        const compressed = await compressImage(file);
        formData.append("product_images", compressed, "service.jpg");
      }

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/files/product-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || "Upload failed");
      }

      const newUrls = json.data.images.map((img) => img.image_url);
      const currentImages = item.product_images || [];

      updateItemImmediate(item.id, {
        product_images: [...currentImages, ...newUrls],
      });
    } catch (err) {
      console.error("Service image upload error:", err);
      setImageError(err.message || "Upload failed");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const removeImage = (urlToRemove) => {
    const currentImages = item.product_images || [];
    const updatedImages = currentImages.filter((url) => url !== urlToRemove);
    updateItemImmediate(item.id, {
      product_images: updatedImages,
    });
  };

  const serviceCategories = [
    "Repair Service",
    "Maintenance & Checkup",
    "Installation",
    "Acid Refilling & Charging",
    "Labor Fee",
    "Wiring & Setup",
    "Other Service",
  ];

  const photos = item.product_images || [];
  const detailsSummary = `${
    item.warranty_duration_months > 0
      ? `${item.warranty_duration_months}M Warranty`
      : "No Warranty"
  } · Photos (${photos.length})`;

  return (
    <div className="bg-white dark:bg-dark-card border border-emerald-200/90 dark:border-emerald-900/50 rounded-xl p-3 sm:p-4 shadow-xs relative transition-all">
      {/* Header & Actions */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-emerald-100/60 dark:border-dark-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-slate-100">
                Service #{index + 1}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                Service / Repair
              </span>
            </div>
            {item.product_name && (
              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5">
                {item.product_name}
              </p>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1">
          {duplicateItem && (
            <button
              type="button"
              onClick={() => duplicateItem(item)}
              className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              title="Duplicate service"
              aria-label={`Duplicate service ${index + 1}`}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1.5 animate-in fade-in">
              <span className="text-xs font-semibold text-rose-600">Delete?</span>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="px-2 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg min-h-[32px]"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-slate-300 rounded-lg min-h-[32px]"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              title="Remove service item"
              aria-label={`Remove service item ${index + 1}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Form Fields */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Service Category */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1">
              Service Category
            </label>
            <div className="relative">
              <input
                type="text"
                value={item.service_category || ""}
                onChange={(e) =>
                  updateItemImmediate(item.id, { service_category: e.target.value })
                }
                onFocus={() => setShowCategoryPresets(true)}
                onBlur={() => setTimeout(() => setShowCategoryPresets(false), 200)}
                placeholder="e.g. Repair, Maintenance..."
                className="w-full h-9 sm:h-8 px-3 text-xs border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100"
              />
            </div>

            {/* Category Dropdown Suggestions */}
            {showCategoryPresets && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-dropdown max-h-48 overflow-y-auto">
                <div className="px-3 py-1.5 text-[11px] font-medium text-gray-400 border-b border-gray-100 dark:border-dark-border">
                  Select Category
                </div>
                {serviceCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onMouseDown={() => {
                      updateItemImmediate(item.id, { service_category: cat });
                      setShowCategoryPresets(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Service Title / Description */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1">
              Service Title / Description <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={item.product_name || ""}
                onChange={(e) => {
                  updateItemImmediate(item.id, { product_name: e.target.value });
                }}
                onFocus={() => setShowPresets(true)}
                onBlur={() => setTimeout(() => setShowPresets(false), 200)}
                placeholder="Type service title (e.g. Inverter PCB Repair)..."
                className={`w-full h-9 sm:h-8 px-3 text-xs border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100 ${
                  errors[`item.${item.id}.product_name`]
                    ? "border-red-500"
                    : "border-gray-300 dark:border-dark-border"
                }`}
              />
            </div>

            {/* Service Presets Dropdown */}
            {showPresets && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-dropdown max-h-48 overflow-y-auto">
                <div className="px-3 py-1.5 text-[11px] font-medium text-gray-400 border-b border-gray-100 dark:border-dark-border">
                  Common Service Presets
                </div>
                {INVOICE_CONSTANTS.SERVICE_PRESETS?.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onMouseDown={() => {
                      updateItemImmediate(item.id, { product_name: preset });
                      setShowPresets(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}

            {errors[`item.${item.id}.product_name`] && (
              <p className="text-[11px] text-red-500 mt-1">
                {errors[`item.${item.id}.product_name`]}
              </p>
            )}
          </div>

          {/* Service Price */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1">
              Service Charge (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={numVal(item.selling_price, 0)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                updateItem(item.id, { selling_price: val });
              }}
              onBlur={() => recalculateInvoice()}
              placeholder="0.00"
              className={`w-full h-9 sm:h-8 px-3 text-xs font-semibold border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100 ${
                errors[`item.${item.id}.selling_price`]
                  ? "border-red-500"
                  : "border-gray-300 dark:border-dark-border"
              }`}
            />
            {errors[`item.${item.id}.selling_price`] && (
              <p className="text-[11px] text-red-500 mt-1">
                {errors[`item.${item.id}.selling_price`]}
              </p>
            )}
          </div>
        </div>

        {/* ── Progressive Disclosure: Warranty, Notes & Photos Tray ── */}
        <div className="rounded-lg border border-gray-100 dark:border-dark-border/70 overflow-hidden bg-gray-50/50 dark:bg-dark-bg/40">
          <button
            type="button"
            id={`tray-btn-${item.id}-service-details`}
            aria-controls={`tray-panel-${item.id}-service-details`}
            aria-expanded={isDetailsOpen}
            onClick={() => setIsDetailsOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-2.5 sm:px-3 text-left hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                Warranty, Notes & Job Photos
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                {detailsSummary}
              </span>
            </div>
            {isDetailsOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            )}
          </button>

          {isDetailsOpen && (
            <div
              id={`tray-panel-${item.id}-service-details`}
              role="region"
              aria-labelledby={`tray-btn-${item.id}-service-details`}
              className="p-2.5 sm:p-3 pt-1 border-t border-gray-100 dark:border-dark-border/50 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={item.quantity || 1}
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value) || 1);
                      updateItem(item.id, { quantity: qty });
                    }}
                    onBlur={() => recalculateInvoice()}
                    className="w-full h-9 sm:h-8 px-3 text-xs border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100"
                  />
                </div>

                {/* Repair Warranty (Months) */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    Repair Warranty
                  </label>
                  <select
                    value={item.warranty_duration_months || 0}
                    onChange={(e) => {
                      const months = parseInt(e.target.value) || 0;
                      const startDate =
                        item.warranty_start_date ||
                        new Date().toISOString().split("T")[0];
                      const start = new Date(startDate);
                      const endDate = new Date(start);
                      endDate.setMonth(start.getMonth() + months);

                      updateItemImmediate(item.id, {
                        warranty_duration_months: months,
                        warranty_start_date: startDate,
                        warranty_end_date:
                          months > 0 ? endDate.toISOString().split("T")[0] : "",
                      });
                    }}
                    className="w-full h-9 sm:h-8 px-3 text-xs border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100"
                  >
                    <option value={0}>No Service Warranty</option>
                    <option value={1}>1 Month Warranty</option>
                    <option value={2}>2 Months Warranty</option>
                    <option value={3}>3 Months Warranty</option>
                    <option value={6}>6 Months Warranty</option>
                    <option value={12}>12 Months Warranty</option>
                  </select>
                </div>

                {/* Work / Technician Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    Work / Technician Notes
                  </label>
                  <input
                    type="text"
                    value={item.notes || ""}
                    onChange={(e) =>
                      updateItemImmediate(item.id, { notes: e.target.value })
                    }
                    placeholder="e.g. Replaced 2 MOSFETs"
                    className="w-full h-9 sm:h-8 px-3 text-xs border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Service Photos */}
              <div className="pt-2 border-t border-gray-100 dark:border-dark-border/50">
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                  Job / Repair Photos (Optional)
                </label>

                {/* Hidden inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  {photos.map((url, i) => (
                    <div
                      key={url + i}
                      className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border group bg-gray-50 dark:bg-dark-bg"
                    >
                      <img
                        src={url}
                        alt={`Service photo ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 transition-opacity"
                        title="Remove photo"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Upload File Button */}
                  <button
                    type="button"
                    disabled={imageUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-900/60 hover:border-emerald-500 flex flex-col items-center justify-center gap-0.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 transition-colors disabled:opacity-50"
                  >
                    {imageUploading ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent" />
                    ) : (
                      <>
                        <ImagePlus className="w-4 h-4" />
                        <span className="text-[9px] font-semibold">Upload</span>
                      </>
                    )}
                  </button>

                  {/* Camera Photo Button */}
                  <button
                    type="button"
                    disabled={imageUploading}
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-14 h-14 rounded-lg border border-dashed border-gray-300 dark:border-dark-border hover:border-emerald-500 flex flex-col items-center justify-center gap-0.5 text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-gray-50 dark:bg-dark-bg transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="text-[9px] font-semibold">Camera</span>
                  </button>
                </div>

                {imageError && (
                  <p className="text-[11px] text-red-500 mt-1">{imageError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ServiceCard;
