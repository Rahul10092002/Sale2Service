import React from "react";
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  Shield,
  Settings,
  ImagePlus,
  X,
} from "lucide-react";
import { Button, Input, SelectField } from "../ui/index.js";
import { INVOICE_CONSTANTS } from "../../utils/constants.js";
import { getToken } from "../../utils/token.js";

const API_BASE_URL =
  import.meta.env.VITE_ENVIRONMENT === "production"
    ? import.meta.env.VITE_PROD_API_URL
    : import.meta.env.VITE_LOCAL_API_URL;

/**
 * Compress an image File using the canvas API.
 * Returns a Blob (JPEG, quality 0.78, max 900px on longest side).
 */
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
  expandedSections,
  updateItem,
  updateItemImmediate,
  removeItem,
  toggleProductMetadata,
  errors,
  recalculateInvoice,
}) {
  const isExpanded = expandedSections.productMetadata[item.id] || false;

  // rawNumbers tracks the raw string the user is currently typing so that
  // backspacing to "" doesn't immediately snap back to the fallback value.
  const [rawNumbers, setRawNumbers] = React.useState({});

  const setRaw = (key, value) =>
    setRawNumbers((prev) => ({ ...prev, [key]: value }));

  const clearRaw = (key) =>
    setRawNumbers((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  // Returns the raw string if the user is editing, otherwise the stored value.
  const numVal = (key, itemValue, fallback) =>
    key in rawNumbers
      ? rawNumbers[key]
      : itemValue !== undefined && itemValue !== null && itemValue !== ""
        ? itemValue
        : fallback;

  // ── Image upload state ──────────────────────────────────────────
  const [imageUploading, setImageUploading] = React.useState(false);
  const [imageError, setImageError] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    setImageUploading(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("product_image", compressed, "product.jpg");

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
      updateItemImmediate(item.id, {
        product_image_url: json.data.image_url,
      });
    } catch (err) {
      console.error("Product image upload error:", err);
      setImageError(err.message || "Upload failed");
    } finally {
      setImageUploading(false);
      // Reset the file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = () => {
    updateItemImmediate(item.id, { product_image_url: null });
    setImageError(null);
  };
  // ── End image upload state ──────────────────────────────────────

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-600" />
          Product {index + 1}
          {item.product_name && (
            <span className="text-sm text-gray-500">- {item.product_name}</span>
          )}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => removeItem(item.id)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serial Number *
            </label>
            <Input
              type="text"
              value={item.serial_number || ""}
              onChange={(e) =>
                updateItem(item.id, { serial_number: e.target.value })
              }
              placeholder="Enter unique serial number"
              error={errors[`item.${item.id}.serial_number`]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <Input
              type="text"
              value={item.product_name || ""}
              onChange={(e) =>
                updateItem(item.id, { product_name: e.target.value })
              }
              placeholder="Product name"
              error={errors[`item.${item.id}.product_name`]}
            />
          </div>

          <div>
            <SelectField
              id={`product-category-${item.id}`}
              label="Product Category"
              value={item.product_category || "BATTERY"}
              onChange={(e) =>
                updateItemImmediate(item.id, {
                  product_category: e.target.value,
                })
              }
              options={Object.entries(INVOICE_CONSTANTS.PRODUCT_CATEGORIES).map(
                ([, value]) => ({
                  value: value,
                  label: value,
                }),
              )}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selling Price *
            </label>
            <Input
              type="number"
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
              step="0.01"
              error={errors[`item.${item.id}.selling_price`]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <Input
              type="number"
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
            />
          </div>
        </div>

        {/* Product Image Upload */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-3">
            <ImagePlus className="w-4 h-4 text-indigo-600" />
            Product Image
          </h4>

          {item.product_image_url ? (
            <div className="relative inline-block">
              <img
                src={item.product_image_url}
                alt="Product"
                className="w-32 h-32 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
              {imageUploading ? (
                <span className="text-xs text-indigo-600 text-center px-2">
                  Uploading…
                </span>
              ) : (
                <>
                  <ImagePlus className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 text-center">
                    Add photo
                  </span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={imageUploading}
                onChange={handleImageChange}
              />
            </label>
          )}

          {imageError && (
            <p className="mt-2 text-xs text-red-600">{imageError}</p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-indigo-600" />
            Warranty Information
          </h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                options={Object.entries(INVOICE_CONSTANTS.WARRANTY_TYPES).map(
                  ([, value]) => ({
                    value: value,
                    label: value,
                  }),
                )}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warranty Duration (Months) *
              </label>
              <Input
                type="number"
                value={numVal(
                  "warranty_duration_months",
                  item.warranty_duration_months,
                  12,
                )}
                onChange={(e) => {
                  setRaw("warranty_duration_months", e.target.value);
                  updateItem(item.id, {
                    warranty_duration_months: parseInt(e.target.value) || 12,
                  });
                  recalculateInvoice();
                }}
                onBlur={() => clearRaw("warranty_duration_months")}
                placeholder="12"
                min="1"
                max="120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warranty End Date
              </label>
              <Input
                type="date"
                value={item.warranty_end_date || ""}
                readOnly
                className="bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-calculated from start date and duration
              </p>
            </div>

            {item.warranty_type === "PRO" && (
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
        </div>

        {/* Service Plan Configuration Section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              Service Plan Configuration
            </h4>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.service_plan_enabled || false}
                onChange={(e) => {
                  if (e.target.checked) {
                    // Check if service plan already exists (for editing scenarios)
                    const existingServicePlan = item.service_plan;

                    if (existingServicePlan) {
                      // Preserve existing service plan data
                      updateItemImmediate(item.id, {
                        service_plan_enabled: true,
                        service_plan: {
                          ...existingServicePlan,
                          is_active: true, // Ensure it's active
                        },
                      });
                    } else {
                      // Create new service plan with defaults
                      const intervalType = "MONTHLY";
                      const intervalValue = 1;
                      const serviceStartDate = computeServiceStartDate(
                        intervalType,
                        intervalValue,
                      );

                      updateItemImmediate(item.id, {
                        service_plan_enabled: true,
                        service_plan: {
                          service_interval_type: intervalType,
                          service_interval_value: intervalValue,
                          service_start_date: serviceStartDate,
                          service_description: `Regular service for ${item.product_name || "Product"}`,
                          service_charge: 0,
                          total_services: 1,
                          is_active: true,
                        },
                      });
                    }
                  } else {
                    const {
                      service_plan,
                      service_plan_enabled,
                      ...itemWithoutServicePlan
                    } = item;
                    updateItemImmediate(item.id, itemWithoutServicePlan);
                  }
                }}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Enable Service Plan</span>
            </label>
          </div>

          {item.service_plan_enabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <SelectField
                    id={`service-interval-type-${item.id}`}
                    label="Service Interval Type"
                    value={
                      item.service_plan?.service_interval_type || "MONTHLY"
                    }
                    onChange={(e) => {
                      const newIntervalType = e.target.value;
                      const intervalValue =
                        item.service_plan?.service_interval_value || 1;
                      const newServiceStartDate = computeServiceStartDate(
                        newIntervalType,
                        intervalValue,
                      );

                      updateItemImmediate(item.id, {
                        ...item,
                        service_plan: {
                          ...item.service_plan,
                          service_interval_type: newIntervalType,
                          service_start_date: newServiceStartDate,
                        },
                      });
                    }}
                    options={[
                      { value: "MONTHLY", label: "Monthly" },
                      { value: "QUARTERLY", label: "Quarterly (3 months)" },
                      {
                        value: "HALF_YEARLY",
                        label: "Half-Yearly (6 months)",
                      },
                      { value: "YEARLY", label: "Yearly (12 months)" },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Interval Value
                  </label>
                  <Input
                    type="number"
                    value={numVal(
                      "sp_interval_value",
                      item.service_plan?.service_interval_value,
                      1,
                    )}
                    onChange={(e) => {
                      setRaw("sp_interval_value", e.target.value);
                      const newIntervalValue = parseInt(e.target.value) || 1;
                      const intervalType =
                        item.service_plan?.service_interval_type || "MONTHLY";
                      const newServiceStartDate = computeServiceStartDate(
                        intervalType,
                        newIntervalValue,
                      );

                      updateItem(item.id, {
                        ...item,
                        service_plan: {
                          ...item.service_plan,
                          service_interval_value: newIntervalValue,
                          service_start_date: newServiceStartDate,
                        },
                      });
                    }}
                    onBlur={() => clearRaw("sp_interval_value")}
                    placeholder="1"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Every {item.service_plan?.service_interval_value || 1}{" "}
                    {item.service_plan?.service_interval_type
                      ?.toLowerCase()
                      .replace("_", " ") || "month(s)"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Start Date
                  </label>
                  <Input
                    type="date"
                    value={item.service_plan?.service_start_date || ""}
                    onChange={(e) =>
                      updateItemImmediate(item.id, {
                        ...item,
                        service_plan: {
                          ...item.service_plan,
                          service_start_date: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Charge (₹)
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
                          service_charge: parseFloat(e.target.value) || 0,
                        },
                      });
                    }}
                    onBlur={() => clearRaw("sp_service_charge")}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Services
                  </label>
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
                        new Date().toISOString().split("T")[0];
                      const intervalType =
                        item.service_plan?.service_interval_type || "MONTHLY";
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service End Date
                  </label>
                  <Input
                    type="date"
                    value={item.service_plan?.service_end_date || ""}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Description
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
                    placeholder="Describe the service to be performed..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Service Plan Summary:</strong> First service will be
                  scheduled {item.service_plan?.service_interval_value || 1}{" "}
                  {item.service_plan?.service_interval_type
                    ?.toLowerCase()
                    .replace("_", " ") || "month(s)"}{" "}
                  from today ({" "}
                  {item.service_plan?.service_start_date
                    ? new Date(
                        item.service_plan.service_start_date,
                      ).toLocaleDateString()
                    : "calculated date"}{" "}
                  ), then every {item.service_plan?.service_interval_value || 1}{" "}
                  {item.service_plan?.service_interval_type
                    ?.toLowerCase()
                    .replace("_", " ") || "month(s)"}{" "}
                  at ₹{item.service_plan?.service_charge || 0} per service.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => toggleProductMetadata(item.id)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="text-sm font-medium text-gray-900">
              Product Metadata & Details
            </h4>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost Price
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
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Margin (%)
                </label>
                <Input
                  type="text"
                  value={item.margin || ""}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
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
  );
});

export default ProductCard;

// Helper: compute service start date based on interval type and value (first service after the interval)
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
