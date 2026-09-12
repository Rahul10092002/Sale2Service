import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Package,
  Shield,
  Settings,
  ImagePlus,
  Camera,
  X,
  ScanLine,
  Sliders,
} from "lucide-react";
import { Input, SelectField } from "../ui/index.js";
import { INVOICE_CONSTANTS } from "../../utils/constants.js";
import { getToken } from "../../utils/token.js";
import SerialScanner from "./SerialScanner.jsx";
import ProductNameAutocomplete from "./ProductNameAutocomplete.jsx";

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

const ProductCard = React.memo(function ProductCard({
  item,
  index,
  updateItem,
  updateItemImmediate,
  removeItem,
  duplicateItem,
  errors = {},
  recalculateInvoice,
}) {
  // Local tray open/close state for progressive disclosure
  const [openTrays, setOpenTrays] = useState({
    warranty: false,
    photos: false,
    servicePlan: !!item.service_plan_enabled,
    metadata: false,
  });

  const toggleTray = useCallback((trayKey) => {
    setOpenTrays((prev) => ({
      ...prev,
      [trayKey]: !prev[trayKey],
    }));
  }, []);

  // Auto-expand trays when relevant validation errors appear
  useEffect(() => {
    if (
      errors[`item.${item.id}.warranty_start_date`] ||
      errors[`item.${item.id}.warranty_duration_months`] ||
      errors[`item.${item.id}.pro_warranty_duration_months`] ||
      errors[`item.${item.id}.warranty_type`]
    ) {
      setOpenTrays((prev) => ({ ...prev, warranty: true }));
    }
    if (
      errors[`item.${item.id}.manufacturing_date`] ||
      errors[`item.${item.id}.capacity_rating`] ||
      errors[`item.${item.id}.voltage`] ||
      errors[`item.${item.id}.batch_number`] ||
      errors[`item.${item.id}.purchase_source`]
    ) {
      setOpenTrays((prev) => ({ ...prev, metadata: true }));
    }
  }, [errors, item.id]);

  const [rawNumbers, setRawNumbers] = useState({});

  const setRaw = (key, value) =>
    setRawNumbers((prev) => ({ ...prev, [key]: value }));

  const clearRaw = (key) =>
    setRawNumbers((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  // Returns raw string while actively typing, otherwise the stored numeric value.
  const numVal = (key, itemValue, fallback) =>
    key in rawNumbers
      ? rawNumbers[key]
      : itemValue !== undefined && itemValue !== null && itemValue !== ""
        ? itemValue
        : fallback;

  // ── Serial scanner state ────────────────────────────────────────
  const [showScanner, setShowScanner] = useState(false);

  // ── Image upload state ──────────────────────────────────────────
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageError(null);
    setImageUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        const compressed = await compressImage(file);
        formData.append("product_images", compressed, "product.jpg");
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
      const currentImages =
        item.product_images ||
        (item.product_image_url ? [item.product_image_url] : []);

      updateItemImmediate(item.id, {
        product_images: [...currentImages, ...newUrls],
      });
    } catch (err) {
      console.error("Product image upload error:", err);
      setImageError(err.message || "Upload failed");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const removeImage = (urlToRemove) => {
    const currentImages =
      item.product_images ||
      (item.product_image_url ? [item.product_image_url] : []);
    const updatedImages = currentImages.filter((url) => url !== urlToRemove);
    updateItemImmediate(item.id, {
      product_images: updatedImages,
      ...(updatedImages.length === 0 && { product_image_url: null }),
    });
    setImageError(null);
  };

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Summary badge derivations
  const images =
    item.product_images ||
    (item.product_image_url ? [item.product_image_url] : []);
  const photoCount = images.length;
  const warrantySummary = `${item.warranty_type || "STANDARD"} · ${item.warranty_duration_months || 12}M`;
  const servicePlanSummary = item.service_plan_enabled
    ? `Active · ${item.service_plan?.service_interval_type || "QUARTERLY"}`
    : "Off";
  const metadataFilledCount = [
    item.capacity_rating,
    item.voltage,
    item.batch_number,
    item.manufacturing_date,
    item.cost_price,
  ].filter(Boolean).length;
  const metadataSummary =
    metadataFilledCount > 0
      ? `${metadataFilledCount} spec${metadataFilledCount > 1 ? "s" : ""} set`
      : "Specs & Margin";

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-200/90 dark:border-dark-border rounded-xl p-3 sm:p-4 shadow-xs relative transition-all">
      {/* Card Header & Actions */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-gray-100 dark:border-dark-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Package className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                Product #{index + 1}
              </h3>
              {item.product_category && (
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                  {item.product_category}
                </span>
              )}
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
              className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              title="Duplicate product"
              aria-label={`Duplicate product ${index + 1}`}
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
              title="Remove product"
              aria-label={`Remove product ${index + 1}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Permanent Core Fields */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Serial Number & Quick Scan */}
          <div className="col-span-1">
            <label className="block text-xs font-bold text-ink-secondary dark:text-slate-200 mb-1">
              Serial Number *
            </label>
            <div className="flex gap-1.5 items-center">
              <div className="flex-1">
                <Input
                  type="text"
                  value={item.serial_number || ""}
                  onChange={(e) =>
                    updateItem(item.id, { serial_number: e.target.value })
                  }
                  placeholder="Enter or scan serial"
                  error={errors[`item.${item.id}.serial_number`]}
                  inputClassName="h-9 sm:h-8 text-xs font-semibold"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                title="Scan barcode / QR code"
                className="shrink-0 h-9 sm:h-8 px-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs transition-transform active:scale-95"
                aria-label="Scan barcode with camera"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Scan</span>
              </button>
            </div>
            {showScanner && (
              <SerialScanner
                onScan={(value) => {
                  updateItemImmediate(item.id, { serial_number: value });
                  setShowScanner(false);
                }}
                onClose={() => setShowScanner(false)}
              />
            )}
          </div>

          {/* Company / Brand */}
          <div>
            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
              Company/Brand *
            </label>
            <Input
              type="text"
              value={item.company || ""}
              onChange={(e) => updateItem(item.id, { company: e.target.value })}
              placeholder="Brand name"
              error={errors[`item.${item.id}.company`]}
            />
          </div>

          {/* Model Number */}
          <div>
            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
              Model Number *
            </label>
            <Input
              type="text"
              value={item.model_number || ""}
              onChange={(e) =>
                updateItem(item.id, { model_number: e.target.value })
              }
              placeholder="Model number"
              error={errors[`item.${item.id}.model_number`]}
            />
          </div>

          {/* Product Name Autocomplete (Optional) */}
          <div>
            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
              Product Name (Optional)
            </label>
            <ProductNameAutocomplete
              value={item.product_name || ""}
              onChange={(text) => updateItem(item.id, { product_name: text })}
              onSelect={(suggestion) => {
                clearRaw("selling_price");
                clearRaw("warranty_duration_months");
                updateItemImmediate(item.id, {
                  product_name: suggestion.product_name,
                  ...(suggestion.product_category && {
                    product_category: suggestion.product_category,
                  }),
                  ...(suggestion.company && { company: suggestion.company }),
                  ...(suggestion.model_number && {
                    model_number: suggestion.model_number,
                  }),
                  ...(suggestion.selling_price > 0 && {
                    selling_price: suggestion.selling_price,
                  }),
                  ...(suggestion.capacity_rating && {
                    capacity_rating: suggestion.capacity_rating,
                  }),
                  ...(suggestion.voltage && { voltage: suggestion.voltage }),
                  ...(suggestion.warranty_type && {
                    warranty_type: suggestion.warranty_type,
                  }),
                  ...(suggestion.warranty_duration_months > 0 && {
                    warranty_duration_months:
                      suggestion.warranty_duration_months,
                  }),
                });
                if (suggestion.selling_price > 0) recalculateInvoice();
              }}
              error={errors[`item.${item.id}.product_name`]}
            />
          </div>

          {/* Product Category */}
          <div>
            <SelectField
              id={`product-category-${item.id}`}
              label="Product Category"
              value={item.product_category || "BATTERY"}
              onChange={(e) => {
                const next = e.target.value;
                updateItemImmediate(item.id, {
                  product_category: next,
                  ...(next !== "BATTERY" && {
                    battery_type: "",
                    vehicle_name: "",
                    vehicle_number_plate: "",
                  }),
                });
              }}
              options={Object.entries(INVOICE_CONSTANTS.PRODUCT_CATEGORIES).map(
                ([, value]) => ({
                  value: value,
                  label: value,
                }),
              )}
              required
            />
          </div>

          {/* Battery-Specific Fields */}
          {item.product_category === "BATTERY" && (
            <>
              <div className="lg:col-span-1">
                <SelectField
                  id={`battery-type-${item.id}`}
                  label="Battery type"
                  value={item.battery_type || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateItemImmediate(item.id, {
                      battery_type: v,
                      ...(v !==
                        INVOICE_CONSTANTS.BATTERY_TYPES.VEHICLE_BATTERY && {
                        vehicle_name: "",
                        vehicle_number_plate: "",
                      }),
                    });
                  }}
                  options={[
                    { value: "", label: "Select type" },
                    ...Object.entries(INVOICE_CONSTANTS.BATTERY_TYPES).map(
                      ([key, value]) => ({
                        value,
                        label:
                          INVOICE_CONSTANTS.BATTERY_TYPE_LABELS[key] || value,
                      }),
                    ),
                  ]}
                  error={errors[`item.${item.id}.battery_type`]}
                />
              </div>

              {item.battery_type ===
                INVOICE_CONSTANTS.BATTERY_TYPES.VEHICLE_BATTERY && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                      Vehicle name *
                    </label>
                    <Input
                      type="text"
                      value={item.vehicle_name || ""}
                      onChange={(e) =>
                        updateItem(item.id, {
                          vehicle_name: e.target.value,
                        })
                      }
                      placeholder="e.g. Maruti Swift"
                      error={errors[`item.${item.id}.vehicle_name`]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                      Number plate *
                    </label>
                    <Input
                      type="text"
                      value={item.vehicle_number_plate || ""}
                      onChange={(e) =>
                        updateItem(item.id, {
                          vehicle_number_plate: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="e.g. MH12AB1234"
                      error={errors[`item.${item.id}.vehicle_number_plate`]}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Selling Price */}
          <div>
            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
              Selling Price (₹) *
            </label>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              value={numVal("selling_price", item.selling_price, "")}
              onChange={(e) => {
                setRaw("selling_price", e.target.value);
                updateItem(item.id, {
                  selling_price: Number(e.target.value) || 0,
                });
                recalculateInvoice();
              }}
              onBlur={() => clearRaw("selling_price")}
              placeholder="0.00"
              min="0"
              error={errors[`item.${item.id}.selling_price`]}
              inputClassName="h-9 sm:h-8 text-xs font-semibold"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
              Quantity
            </label>
            <Input
              type="number"
              inputMode="numeric"
              value={numVal("quantity", item.quantity, 1)}
              onChange={(e) => {
                setRaw("quantity", e.target.value);
                updateItem(item.id, {
                  quantity: parseInt(e.target.value) || 1,
                });
                recalculateInvoice();
              }}
              onBlur={() => clearRaw("quantity")}
              placeholder="1"
              min="1"
              inputClassName="h-9 sm:h-8 text-xs font-semibold"
            />
          </div>
        </div>

        {/* ── Progressive Disclosure Accordion Trays ── */}
        <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-dark-border/60">
          {/* 1. Warranty Tray */}
          <div className="rounded-lg border border-gray-100 dark:border-dark-border/70 overflow-hidden bg-gray-50/50 dark:bg-dark-bg/40">
            <button
              type="button"
              id={`tray-btn-${item.id}-warranty`}
              aria-controls={`tray-panel-${item.id}-warranty`}
              aria-expanded={openTrays.warranty}
              onClick={() => toggleTray("warranty")}
              className="w-full flex items-center justify-between p-2.5 sm:px-3 text-left hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                  Warranty Details
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                  {warrantySummary}
                </span>
                {errors[`item.${item.id}.warranty_start_date`] && (
                  <span className="text-[10px] text-red-500 font-bold">
                    • Error
                  </span>
                )}
              </div>
              {openTrays.warranty ? (
                <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              )}
            </button>

            {openTrays.warranty && (
              <div
                id={`tray-panel-${item.id}-warranty`}
                role="region"
                aria-labelledby={`tray-btn-${item.id}-warranty`}
                className="p-2.5 sm:p-3 pt-1 border-t border-gray-100 dark:border-dark-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5"
              >
                <div>
                  <SelectField
                    id={`warranty-type-${item.id}`}
                    label="Warranty Type"
                    value={item.warranty_type || "STANDARD"}
                    onChange={(e) =>
                      updateItemImmediate(item.id, {
                        warranty_type: e.target.value,
                      })
                    }
                    options={Object.entries(
                      INVOICE_CONSTANTS.WARRANTY_TYPES,
                    ).map(([, value]) => ({
                      value: value,
                      label: value,
                    }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Warranty Duration (Months) *
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={numVal(
                      "warranty_duration_months",
                      item.warranty_duration_months,
                      12,
                    )}
                    onChange={(e) => {
                      setRaw("warranty_duration_months", e.target.value);
                      updateItem(item.id, {
                        warranty_duration_months:
                          parseInt(e.target.value) || 12,
                      });
                      recalculateInvoice();
                    }}
                    onBlur={() => clearRaw("warranty_duration_months")}
                    placeholder="12"
                    min="1"
                    max="120"
                    inputClassName="h-9 sm:h-8 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Warranty Start Date *
                  </label>
                  <Input
                    type="date"
                    value={item.warranty_start_date || ""}
                    onChange={(e) =>
                      updateItemImmediate(item.id, {
                        warranty_start_date: e.target.value,
                      })
                    }
                    error={errors[`item.${item.id}.warranty_start_date`]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Warranty End Date
                  </label>
                  <Input
                    type="date"
                    value={item.warranty_end_date || ""}
                    readOnly
                    className="cursor-not-allowed bg-gray-50 dark:bg-dark-input/50 text-xs"
                  />
                </div>

                {item.warranty_type === "PRO" && (
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                      Pro Warranty End Date
                    </label>
                    <Input
                      type="date"
                      value={item.pro_warranty_end_date || ""}
                      onChange={(e) =>
                        updateItemImmediate(item.id, {
                          pro_warranty_end_date: e.target.value,
                        })
                      }
                      placeholder="Extended warranty end date"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Photos Tray */}
          <div className="rounded-lg border border-gray-100 dark:border-dark-border/70 overflow-hidden bg-gray-50/50 dark:bg-dark-bg/40">
            <button
              type="button"
              id={`tray-btn-${item.id}-photos`}
              aria-controls={`tray-panel-${item.id}-photos`}
              aria-expanded={openTrays.photos}
              onClick={() => toggleTray("photos")}
              className="w-full flex items-center justify-between p-2.5 sm:px-3 text-left hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ImagePlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                  Product Photos
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200/80 dark:bg-dark-hover text-gray-700 dark:text-slate-300">
                  Photos ({photoCount})
                </span>
              </div>
              {openTrays.photos ? (
                <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              )}
            </button>

            {openTrays.photos && (
              <div
                id={`tray-panel-${item.id}-photos`}
                role="region"
                aria-labelledby={`tray-btn-${item.id}-photos`}
                className="p-2.5 sm:p-3 pt-1 border-t border-gray-100 dark:border-dark-border/50 space-y-2"
              >
                <div className="flex flex-wrap gap-2">
                  {images.map((url, idx) => (
                    <div key={idx} className="relative inline-block">
                      <img
                        src={url}
                        alt={`Product ${idx + 1}`}
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
                        <span className="text-[10px] font-semibold text-gray-600 dark:text-slate-300 mt-0.5">Upload</span>
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
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">Camera</span>
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
                  <p className="text-[11px] text-red-600">{imageError}</p>
                )}
              </div>
            )}
          </div>

          {/* 3. Service Plan Tray */}
          <div className="rounded-lg border border-gray-100 dark:border-dark-border/70 overflow-hidden bg-gray-50/50 dark:bg-dark-bg/40">
            <button
              type="button"
              id={`tray-btn-${item.id}-serviceplan`}
              aria-controls={`tray-panel-${item.id}-serviceplan`}
              aria-expanded={openTrays.servicePlan}
              onClick={() => toggleTray("servicePlan")}
              className="w-full flex items-center justify-between p-2.5 sm:px-3 text-left hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                  Service Plan Configuration
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.service_plan_enabled
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-gray-200/80 dark:bg-dark-hover text-gray-600 dark:text-slate-400"
                  }`}
                >
                  {servicePlanSummary}
                </span>
              </div>
              {openTrays.servicePlan ? (
                <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              )}
            </button>

            {openTrays.servicePlan && (
              <div
                id={`tray-panel-${item.id}-serviceplan`}
                role="region"
                aria-labelledby={`tray-btn-${item.id}-serviceplan`}
                className="p-2.5 sm:p-3 pt-1 border-t border-gray-100 dark:border-dark-border/50 space-y-3"
              >
                {/* Toggle Pill */}
                <div className="flex items-center justify-between bg-white dark:bg-dark-card p-2.5 rounded-lg border border-gray-200/70 dark:border-dark-border">
                  <div>
                    <span className="text-xs font-bold text-gray-900 dark:text-slate-100 block">
                      Enable Maintenance Service Plan
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-slate-400">
                      Auto-schedules recurring maintenance visits
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(item.service_plan_enabled)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const existingServicePlan = item.service_plan;
                          if (existingServicePlan) {
                            updateItemImmediate(item.id, {
                              service_plan_enabled: true,
                              service_plan: {
                                ...existingServicePlan,
                                is_active: true,
                              },
                            });
                          } else {
                            const intervalType = "QUARTERLY";
                            const intervalValue = 1;
                            const serviceStartDate = computeServiceStartDate(
                              intervalType,
                              intervalValue,
                            );
                            const warrantyEnd = getEffectiveWarrantyEndDate(item);
                            const autoVisits = computeVisitsFromWarranty(
                              serviceStartDate,
                              warrantyEnd,
                              intervalType,
                              intervalValue,
                            );
                            const serviceEndDate = computeServiceEndDate(
                              serviceStartDate,
                              intervalType,
                              intervalValue,
                              autoVisits,
                            );

                            updateItemImmediate(item.id, {
                              service_plan_enabled: true,
                              service_plan: {
                                service_interval_type: intervalType,
                                service_interval_value: intervalValue,
                                service_start_date: serviceStartDate,
                                service_end_date: serviceEndDate,
                                service_description: `Regular service for ${item.product_name || "Product"}`,
                                service_charge: 0,
                                total_services: autoVisits,
                                is_active: true,
                              },
                            });
                          }
                        } else {
                          updateItemImmediate(item.id, {
                            service_plan_enabled: false,
                            service_plan: null,
                          });
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-dark-border peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {item.service_plan_enabled && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                      <div>
                        <SelectField
                          id={`service-interval-type-${item.id}`}
                          label="Frequency"
                          value={
                            item.service_plan?.service_interval_type || "QUARTERLY"
                          }
                          onChange={(e) => {
                            const newFrequency = e.target.value;
                            const currentVal =
                              item.service_plan?.service_interval_value || 1;
                            const newIntervalValue =
                              newFrequency === "CUSTOM"
                                ? currentVal > 1
                                  ? currentVal
                                  : 2
                                : 1;
                            const currentStart =
                              item.service_plan?.service_start_date ||
                              computeServiceStartDate(
                                newFrequency,
                                newIntervalValue,
                              );
                            const warrantyEnd = getEffectiveWarrantyEndDate(item);
                            const autoVisits = computeVisitsFromWarranty(
                              currentStart,
                              warrantyEnd,
                              newFrequency,
                              newIntervalValue,
                            );
                            const newEndDate = computeServiceEndDate(
                              currentStart,
                              newFrequency,
                              newIntervalValue,
                              autoVisits,
                            );

                            updateItemImmediate(item.id, {
                              ...item,
                              service_plan: {
                                ...item.service_plan,
                                service_interval_type: newFrequency,
                                service_interval_value: newIntervalValue,
                                service_start_date: currentStart,
                                total_services: autoVisits,
                                service_end_date: newEndDate,
                              },
                            });
                          }}
                          options={[
                            { value: "MONTHLY", label: "Monthly (1 month)" },
                            {
                              value: "QUARTERLY",
                              label: "Quarterly (3 months)",
                            },
                            {
                              value: "HALF_YEARLY",
                              label: "Half-Yearly (6 months)",
                            },
                            { value: "YEARLY", label: "Yearly (12 months)" },
                            { value: "CUSTOM", label: "Custom interval..." },
                          ]}
                        />
                      </div>

                      {item.service_plan?.service_interval_type === "CUSTOM" && (
                        <div>
                          <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                            Repeat Every (Months)
                          </label>
                          <Input
                            type="number"
                            value={numVal(
                              "sp_interval_value",
                              item.service_plan?.service_interval_value,
                              2,
                            )}
                            onChange={(e) => {
                              setRaw("sp_interval_value", e.target.value);
                              const newIntervalValue =
                                parseInt(e.target.value) || 1;
                              const currentStart =
                                item.service_plan?.service_start_date ||
                                computeServiceStartDate(
                                  "CUSTOM",
                                  newIntervalValue,
                                );
                              const warrantyEnd = getEffectiveWarrantyEndDate(item);
                              const autoVisits = computeVisitsFromWarranty(
                                currentStart,
                                warrantyEnd,
                                "CUSTOM",
                                newIntervalValue,
                              );
                              const newEndDate = computeServiceEndDate(
                                currentStart,
                                "CUSTOM",
                                newIntervalValue,
                                autoVisits,
                              );

                              updateItem(item.id, {
                                ...item,
                                service_plan: {
                                  ...item.service_plan,
                                  service_interval_value: newIntervalValue,
                                  total_services: autoVisits,
                                  service_end_date: newEndDate,
                                },
                              });
                            }}
                            onBlur={() => clearRaw("sp_interval_value")}
                            placeholder="2"
                            min="1"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                          First Service Date
                        </label>
                        <Input
                          type="date"
                          value={item.service_plan?.service_start_date || ""}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            const intervalType =
                              item.service_plan?.service_interval_type ||
                              "QUARTERLY";
                            const intervalValue =
                              item.service_plan?.service_interval_value || 1;
                            const warrantyEnd = getEffectiveWarrantyEndDate(item);
                            const autoVisits = computeVisitsFromWarranty(
                              newStart,
                              warrantyEnd,
                              intervalType,
                              intervalValue,
                            );
                            const newEndDate = computeServiceEndDate(
                              newStart,
                              intervalType,
                              intervalValue,
                              autoVisits,
                            );
                            updateItemImmediate(item.id, {
                              ...item,
                              service_plan: {
                                ...item.service_plan,
                                service_start_date: newStart,
                                total_services: autoVisits,
                                service_end_date: newEndDate,
                              },
                            });
                          }}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300">
                            Total Visits
                          </label>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            Auto (Warranty)
                          </span>
                        </div>
                        <Input
                          type="number"
                          value={numVal(
                            "sp_total_services",
                            item.service_plan?.total_services,
                            1,
                          )}
                          onChange={(e) => {
                            setRaw("sp_total_services", e.target.value);
                            const total = parseInt(e.target.value) || 1;
                            const start =
                              item.service_plan?.service_start_date ||
                              computeServiceStartDate(
                                item.service_plan?.service_interval_type ||
                                  "QUARTERLY",
                                item.service_plan?.service_interval_value || 1,
                              );
                            const intervalType =
                              item.service_plan?.service_interval_type ||
                              "QUARTERLY";
                            const intervalValue =
                              item.service_plan?.service_interval_value || 1;
                            const endDate = computeServiceEndDate(
                              start,
                              intervalType,
                              intervalValue,
                              total,
                            );

                            updateItem(item.id, {
                              ...item,
                              service_plan: {
                                ...item.service_plan,
                                total_services: total,
                                service_end_date: endDate,
                              },
                            });
                          }}
                          onBlur={() => clearRaw("sp_total_services")}
                          placeholder="1"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                          Charge per Visit (₹)
                        </label>
                        <Input
                          type="number"
                          value={numVal(
                            "sp_service_charge",
                            item.service_plan?.service_charge,
                            0,
                          )}
                          onChange={(e) => {
                            setRaw("sp_service_charge", e.target.value);
                            updateItem(item.id, {
                              ...item,
                              service_plan: {
                                ...item.service_plan,
                                service_charge:
                                  parseFloat(e.target.value) || 0,
                              },
                            });
                          }}
                          onBlur={() => clearRaw("sp_service_charge")}
                          placeholder="0.00"
                          min="0"
                          step="1"
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-4">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                          Service Description (Optional)
                        </label>
                        <textarea
                          value={item.service_plan?.service_description || ""}
                          onChange={(e) =>
                            updateItem(item.id, {
                              ...item,
                              service_plan: {
                                ...item.service_plan,
                                service_description: e.target.value,
                              },
                            })
                          }
                          placeholder="Describe the service to be performed... (optional)"
                          rows={2}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none dark:bg-dark-bg dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Dynamic Derived Summary Banner */}
                    {(() => {
                      const sp = item.service_plan || {};
                      const intervalType = sp.service_interval_type || "QUARTERLY";
                      const intervalValue = sp.service_interval_value || 1;
                      const start = sp.service_start_date;
                      const total = Number(sp.total_services) || 1;
                      const charge = Number(sp.service_charge) || 0;
                      const end = computeServiceEndDate(
                        start,
                        intervalType,
                        intervalValue,
                        total,
                      );

                      let cadenceText = "Every 1 month (Monthly)";
                      if (intervalType === "QUARTERLY") cadenceText = "Every 3 months (Quarterly)";
                      else if (intervalType === "HALF_YEARLY" || intervalType === "SEMI_ANNUALLY")
                        cadenceText = "Every 6 months (Half-Yearly)";
                      else if (intervalType === "YEARLY" || intervalType === "ANNUALLY")
                        cadenceText = "Every 12 months (Yearly)";
                      else if (intervalType === "CUSTOM")
                        cadenceText = `Every ${intervalValue} month${intervalValue > 1 ? "s" : ""}`;

                      return (
                        <div className="bg-gradient-to-r from-indigo-50/90 to-blue-50/70 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 p-2.5 sm:p-3 rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-1.5">
                            <div className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                              <span>
                                {total} {total === 1 ? "visit" : "visits"}
                                {start && (
                                  <span className="font-normal text-gray-700 dark:text-slate-300">
                                    :{" "}
                                    {new Date(start).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                    {total > 1 && end && (
                                      <>
                                        {" "}→{" "}
                                        {new Date(end).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </>
                                    )}
                                  </span>
                                )}
                              </span>
                            </div>
                            <span className="font-bold text-indigo-700 dark:text-indigo-300">
                              {charge > 0
                                ? `₹${charge.toLocaleString("en-IN")} / visit · Total ₹${(total * charge).toLocaleString("en-IN")}`
                                : "Free of charge"}
                            </span>
                          </div>
                          <p className="text-[11px] text-indigo-600/80 dark:text-indigo-300/70">
                            Cadence: {cadenceText}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Additional Specs & Metadata Tray */}
          <div className="rounded-lg border border-gray-100 dark:border-dark-border/70 overflow-hidden bg-gray-50/50 dark:bg-dark-bg/40">
            <button
              type="button"
              id={`tray-btn-${item.id}-metadata`}
              aria-controls={`tray-panel-${item.id}-metadata`}
              aria-expanded={openTrays.metadata}
              onClick={() => toggleTray("metadata")}
              className="w-full flex items-center justify-between p-2.5 sm:px-3 text-left hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                  Additional Specs & Metadata
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200/80 dark:bg-dark-hover text-gray-700 dark:text-slate-300">
                  {metadataSummary}
                </span>
              </div>
              {openTrays.metadata ? (
                <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              )}
            </button>

            {openTrays.metadata && (
              <div
                id={`tray-panel-${item.id}-metadata`}
                role="region"
                aria-labelledby={`tray-btn-${item.id}-metadata`}
                className="p-2.5 sm:p-3 pt-1 border-t border-gray-100 dark:border-dark-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5"
              >
                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Manufacturing Date
                  </label>
                  <Input
                    type="date"
                    value={item.manufacturing_date || ""}
                    onChange={(e) =>
                      updateItemImmediate(item.id, {
                        manufacturing_date: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Capacity Rating
                  </label>
                  <Input
                    type="text"
                    value={item.capacity_rating || ""}
                    onChange={(e) =>
                      updateItem(item.id, { capacity_rating: e.target.value })
                    }
                    placeholder="e.g., 150Ah"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Voltage
                  </label>
                  <Input
                    type="text"
                    value={item.voltage || ""}
                    onChange={(e) =>
                      updateItem(item.id, { voltage: e.target.value })
                    }
                    placeholder="e.g., 12V"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Batch Number
                  </label>
                  <Input
                    type="text"
                    value={item.batch_number || ""}
                    onChange={(e) =>
                      updateItem(item.id, { batch_number: e.target.value })
                    }
                    placeholder="Batch number"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Purchase Source
                  </label>
                  <Input
                    type="text"
                    value={item.purchase_source || ""}
                    onChange={(e) =>
                      updateItem(item.id, { purchase_source: e.target.value })
                    }
                    placeholder="Supplier name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Cost Price (₹)
                  </label>
                  <Input
                    type="number"
                    value={numVal("cost_price", item.cost_price, "")}
                    onChange={(e) => {
                      setRaw("cost_price", e.target.value);
                      updateItem(item.id, {
                        cost_price: Number(e.target.value) || 0,
                      });
                      recalculateInvoice();
                    }}
                    onBlur={() => clearRaw("cost_price")}
                    placeholder="0.00"
                    min="0"
                    step="1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Margin (%)
                  </label>
                  <Input
                    type="text"
                    value={item.margin || ""}
                    readOnly
                    className="cursor-not-allowed bg-gray-50 dark:bg-dark-input/50"
                    placeholder="Auto-calculated"
                  />
                </div>

                <div>
                  <SelectField
                    id={`status-${item.id}`}
                    label="Status"
                    value={item.status}
                    onChange={(e) =>
                      updateItemImmediate(item.id, { status: e.target.value })
                    }
                    options={Object.entries(
                      INVOICE_CONSTANTS.PRODUCT_STATUSES,
                    ).map(([, value]) => ({ value: value, label: value }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;

// Helper: get effective warranty end date for product
function getEffectiveWarrantyEndDate(item) {
  if (item?.warranty_type === "PRO" && item?.pro_warranty_end_date) {
    return item.pro_warranty_end_date;
  }
  if (item?.warranty_end_date) {
    return item.warranty_end_date;
  }
  if (item?.warranty_start_date && item?.warranty_duration_months) {
    const start = new Date(item.warranty_start_date);
    start.setMonth(start.getMonth() + Number(item.warranty_duration_months));
    return start.toISOString().split("T")[0];
  }
  const d = new Date();
  d.setMonth(d.getMonth() + 12);
  return d.toISOString().split("T")[0];
}

// Helper: auto-calculate number of visits based on warranty end date
function computeVisitsFromWarranty(
  serviceStartDate,
  warrantyEndDate,
  intervalType,
  intervalValue,
) {
  let deltaMonths = 1;
  switch ((intervalType || "MONTHLY").toUpperCase()) {
    case "QUARTERLY":
      deltaMonths = 3 * (Number(intervalValue) || 1);
      break;
    case "SEMI_ANNUALLY":
    case "HALF_YEARLY":
      deltaMonths = 6 * (Number(intervalValue) || 1);
      break;
    case "ANNUALLY":
    case "YEARLY":
      deltaMonths = 12 * (Number(intervalValue) || 1);
      break;
    case "CUSTOM":
    default:
      deltaMonths = Number(intervalValue) || 1;
      break;
  }

  if (!serviceStartDate || !warrantyEndDate || deltaMonths <= 0) {
    return 1;
  }

  const start = new Date(serviceStartDate);
  const end = new Date(warrantyEndDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 1;
  }

  const monthsDiff =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    (end.getDate() >= start.getDate() ? 0 : -1);

  if (monthsDiff < 0) return 1;

  const visits = Math.floor(monthsDiff / deltaMonths) + 1;
  return Math.max(1, visits);
}

// Helper: compute service start date based on interval type and value
function computeServiceStartDate(intervalType, intervalValue) {
  const today = new Date();
  let monthsToAdd = 0;

  switch ((intervalType || "MONTHLY").toUpperCase()) {
    case "MONTHLY":
      monthsToAdd = intervalValue || 1;
      break;
    case "QUARTERLY":
      monthsToAdd = 3 * (intervalValue || 1);
      break;
    case "SEMI_ANNUALLY":
    case "HALF_YEARLY":
      monthsToAdd = 6 * (intervalValue || 1);
      break;
    case "ANNUALLY":
    case "YEARLY":
      monthsToAdd = 12 * (intervalValue || 1);
      break;
    case "CUSTOM":
      monthsToAdd = intervalValue || 1;
      break;
    default:
      monthsToAdd = intervalValue || 1;
  }

  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() + monthsToAdd);
  return startDate.toISOString().split("T")[0];
}

// Helper: compute service end date based on start date, interval and count
function computeServiceEndDate(
  startDateStr,
  intervalType,
  intervalValue,
  totalServices,
) {
  if (!startDateStr) return "";
  const start = new Date(startDateStr);
  let monthsDelta = 0;

  switch ((intervalType || "MONTHLY").toUpperCase()) {
    case "MONTHLY":
      monthsDelta = intervalValue || 1;
      break;
    case "QUARTERLY":
      monthsDelta = 3 * (intervalValue || 1);
      break;
    case "SEMI_ANNUALLY":
    case "HALF_YEARLY":
      monthsDelta = 6 * (intervalValue || 1);
      break;
    case "ANNUALLY":
    case "YEARLY":
      monthsDelta = 12 * (intervalValue || 1);
      break;
    case "CUSTOM":
      monthsDelta = intervalValue || 1;
      break;
    default:
      monthsDelta = intervalValue || 1;
  }

  const totalMonths = monthsDelta * Math.max((totalServices || 1) - 1, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + totalMonths);
  return end.toISOString().split("T")[0];
}
