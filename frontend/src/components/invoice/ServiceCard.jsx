import React, { useState, useRef } from "react";
import {
  Wrench,
  Trash2,
  Shield,
  FileText,
  Camera,
  ImagePlus,
  X,
} from "lucide-react";
import { Button } from "../ui/index.js";
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
  errors,
  recalculateInvoice,
}) {
  const [showPresets, setShowPresets] = useState(false);
  const [showCategoryPresets, setShowCategoryPresets] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState(null);

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

  return (
    <div className="bg-white dark:bg-dark-card border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 sm:p-5 shadow-xs relative transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">
                Item #{index + 1}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Service / Repair
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Service, labor, or maintenance charge
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeItem(item.id)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 p-2"
          title="Remove service item"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Primary Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Service Category (Custom typed + Preset options) */}
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
              placeholder="e.g. Repair, Maintenance, Custom..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100"
            />
          </div>

          {/* Category Dropdown Suggestions */}
          {showCategoryPresets && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              <div className="px-3 py-1.5 text-xs font-medium text-gray-400 border-b border-gray-100 dark:border-dark-border">
                Select or Type Category
              </div>
              {serviceCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onMouseDown={() => {
                    updateItemImmediate(item.id, { service_category: cat });
                    setShowCategoryPresets(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Service Title / Description (Custom typed + Presets) */}
        <div className="relative md:col-span-2">
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
              placeholder="Type any service title (e.g. Inverter PCB Repair, Acid Refill)..."
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100 ${
                errors[`item.${item.id}.product_name`]
                  ? "border-red-500"
                  : "border-gray-300 dark:border-dark-border"
              }`}
            />
          </div>

          {/* Service Presets Dropdown */}
          {showPresets && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              <div className="px-3 py-1.5 text-xs font-medium text-gray-400 border-b border-gray-100 dark:border-dark-border">
                Common Service Presets (or type custom)
              </div>
              {INVOICE_CONSTANTS.SERVICE_PRESETS?.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onMouseDown={() => {
                    updateItemImmediate(item.id, { product_name: preset });
                    setShowPresets(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          )}

          {errors[`item.${item.id}.product_name`] && (
            <p className="text-xs text-red-500 mt-1">
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
            min="0"
            step="0.01"
            value={numVal(item.selling_price, 0)}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              updateItem(item.id, { selling_price: val });
            }}
            onBlur={() => recalculateInvoice()}
            placeholder="0.00"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100 ${
              errors[`item.${item.id}.selling_price`]
                ? "border-red-500"
                : "border-gray-300 dark:border-dark-border"
            }`}
          />
          {errors[`item.${item.id}.selling_price`] && (
            <p className="text-xs text-red-500 mt-1">
              {errors[`item.${item.id}.selling_price`]}
            </p>
          )}
        </div>
      </div>

      {/* Secondary details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-dark-border">
        {/* Quantity */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            value={item.quantity || 1}
            onChange={(e) => {
              const qty = Math.max(1, parseInt(e.target.value) || 1);
              updateItem(item.id, { quantity: qty });
            }}
            onBlur={() => recalculateInvoice()}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100"
          />
        </div>

        {/* Repair Warranty (Months) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            Repair Warranty (Months)
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
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100"
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
            placeholder="e.g. Replaced 2 MOSFETs, refilled 6 cells"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100"
          />
        </div>
      </div>

      {/* Service Images Upload Section */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border">
        <label className="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-2">
          Service / Job Photos (Optional)
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

        {/* Image Grid & Upload Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {(item.product_images || []).map((url, i) => (
            <div
              key={url + i}
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border group bg-gray-50 dark:bg-dark-bg"
            >
              <img
                src={url}
                alt={`Service photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 transition-opacity"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Upload File Button */}
          <button
            type="button"
            disabled={imageUploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-900/60 hover:border-emerald-500 flex flex-col items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 transition-colors disabled:opacity-50"
          >
            {imageUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent" />
            ) : (
              <>
                <ImagePlus className="w-5 h-5" />
                <span className="text-[10px] font-medium">Add Photo</span>
              </>
            )}
          </button>

          {/* Camera Photo Button */}
          <button
            type="button"
            disabled={imageUploading}
            onClick={() => cameraInputRef.current?.click()}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-dark-border hover:border-emerald-500 flex flex-col items-center justify-center gap-1 text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-gray-50 dark:bg-dark-bg transition-colors disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px] font-medium">Camera</span>
          </button>
        </div>

        {imageError && (
          <p className="text-xs text-red-500 mt-1">{imageError}</p>
        )}
      </div>
    </div>
  );
});

export default ServiceCard;
