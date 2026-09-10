import React, { useState } from "react";
import { Plus, Calendar, Wrench, AlertCircle } from "lucide-react";
import { Dialog as Modal, DialogHeader, DialogBody } from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import SelectField from "../ui/SelectField.jsx";
import LoadingSpinner from "../ui/LoadingSpinner.jsx";
import { getToken } from "../../utils/token.js";

// Helper: compute service start date
function computeServiceStartDate(intervalType, intervalValue) {
  const today = new Date();
  let monthsToAdd = 0;
  switch ((intervalType || "MONTHLY").toUpperCase()) {
    case "MONTHLY":
      monthsToAdd = Number(intervalValue) || 1;
      break;
    case "QUARTERLY":
      monthsToAdd = 3 * (Number(intervalValue) || 1);
      break;
    case "SEMI_ANNUALLY":
    case "HALF_YEARLY":
      monthsToAdd = 6 * (Number(intervalValue) || 1);
      break;
    case "ANNUALLY":
    case "YEARLY":
      monthsToAdd = 12 * (Number(intervalValue) || 1);
      break;
    case "CUSTOM":
    default:
      monthsToAdd = Number(intervalValue) || 1;
      break;
  }
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() + monthsToAdd);
  return startDate.toISOString().split("T")[0];
}

// Helper: get effective warranty end date
function getEffectiveWarrantyEndDate(product) {
  if (product?.pro_warranty_end_date) return product.pro_warranty_end_date;
  if (product?.warranty_end_date) return product.warranty_end_date;
  if (product?.warranty_start_date && product?.warranty_duration_months) {
    const start = new Date(product.warranty_start_date);
    start.setMonth(start.getMonth() + Number(product.warranty_duration_months));
    return start.toISOString().split("T")[0];
  }
  const d = new Date();
  d.setMonth(d.getMonth() + 12);
  return d.toISOString().split("T")[0];
}

// Helper: auto-calculate visits from warranty end date
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

  if (!serviceStartDate || !warrantyEndDate || deltaMonths <= 0) return 1;
  const start = new Date(serviceStartDate);
  const end = new Date(warrantyEndDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;

  const monthsDiff =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    (end.getDate() >= start.getDate() ? 0 : -1);

  if (monthsDiff < 0) return 1;
  return Math.max(1, Math.floor(monthsDiff / deltaMonths) + 1);
}

/**
 * Schedule Service Modal
 * Form to create a new service plan for a product
 */
export const ScheduleServiceModal = ({
  itemId,
  invoiceId,
  product,
  isOpen,
  onClose,
  onScheduled,
}) => {
  const initialStartDate = computeServiceStartDate("MONTHLY", 1);
  const initialWarrantyEnd = getEffectiveWarrantyEndDate(product);
  const initialVisits = computeVisitsFromWarranty(
    initialStartDate,
    initialWarrantyEnd,
    "MONTHLY",
    1,
  );

  const [formData, setFormData] = useState({
    service_interval_type: "MONTHLY",
    service_interval_value: "1",
    service_start_date: initialStartDate,
    total_services: String(initialVisits),
    service_description: product?.product_name
      ? `Service for ${product.product_name}`
      : "",
    service_charge: "0",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.service_interval_value || !formData.service_start_date) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/invoices/items/${itemId}/services`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create service plan");
      }

      // Success
      onScheduled(result.data);
    } catch (err) {
      console.error("Create service plan error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const intervalOptions = [
    { value: "MONTHLY", label: "Month(s)" },
    { value: "QUARTERLY", label: "Quarter(s) - 3 months" },
    { value: "HALF_YEARLY", label: "Half-Yearly - 6 months" },
    { value: "YEARLY", label: "Year(s)" },
  ];

  const intervalValueOptions = Array.from({ length: 24 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const totalServicesOptions = Array.from({ length: 20 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  // Helper function to format interval type for display
  const formatIntervalType = (intervalType) => {
    switch (intervalType) {
      case "MONTHLY":
        return "month";
      case "QUARTERLY":
        return "quarter";
      case "HALF_YEARLY":
        return "half-year";
      case "YEARLY":
        return "year";
      default:
        return intervalType.toLowerCase();
    }
  };

  // Set default start date to 30 days from today if not set
  if (!formData.service_start_date) {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setFormData((prev) => ({
      ...prev,
      service_start_date: defaultDate.toISOString().split("T")[0],
    }));
  }

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <Plus className="text-green-600" size={20} />
          <span>Schedule Service Plan</span>
        </div>
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Information */}
        <div className="bg-gray-50 dark:bg-dark-subtle p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">
            Product Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-ink-secondary dark:text-slate-400">Product:</span>
              <span className="ml-2 font-medium">{product?.product_name}</span>
            </div>
            {product?.serial_number && (
              <div>
                <span className="text-ink-secondary dark:text-slate-400">Serial:</span>
                <span className="ml-2 font-medium">
                  {product.serial_number}
                </span>
              </div>
            )}
            {product?.company && (
              <div>
                <span className="text-ink-secondary dark:text-slate-400">Brand:</span>
                <span className="ml-2 font-medium">{product.company}</span>
              </div>
            )}
            {product?.model_number && (
              <div>
                <span className="text-ink-secondary dark:text-slate-400">Model:</span>
                <span className="ml-2 font-medium">{product.model_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle size={16} />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Service Schedule */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            Service Schedule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-1">
                Frequency *
              </label>
              <select
                value={formData.service_interval_type}
                onChange={(e) => {
                  const nextType = e.target.value;
                  const currentVal = formData.service_interval_value;
                  const nextVal =
                    nextType === "CUSTOM"
                      ? currentVal > 1
                        ? currentVal
                        : "2"
                      : "1";
                  const start =
                    formData.service_start_date ||
                    computeServiceStartDate(nextType, nextVal);
                  const warrantyEnd = getEffectiveWarrantyEndDate(product);
                  const autoVisits = computeVisitsFromWarranty(
                    start,
                    warrantyEnd,
                    nextType,
                    nextVal,
                  );
                  setFormData((prev) => ({
                    ...prev,
                    service_interval_type: nextType,
                    service_interval_value: nextVal,
                    service_start_date: start,
                    total_services: String(autoVisits),
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-ink-base dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="MONTHLY">Monthly (1 month)</option>
                <option value="QUARTERLY">Quarterly (3 months)</option>
                <option value="HALF_YEARLY">Half-Yearly (6 months)</option>
                <option value="YEARLY">Yearly (12 months)</option>
                <option value="CUSTOM">Custom interval...</option>
              </select>
            </div>

            {formData.service_interval_type === "CUSTOM" && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  Repeat Every (Months) *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.service_interval_value}
                  onChange={(e) => {
                    const val = e.target.value;
                    const warrantyEnd = getEffectiveWarrantyEndDate(product);
                    const autoVisits = computeVisitsFromWarranty(
                      formData.service_start_date,
                      warrantyEnd,
                      "CUSTOM",
                      val,
                    );
                    setFormData((prev) => ({
                      ...prev,
                      service_interval_value: val,
                      total_services: String(autoVisits),
                    }));
                  }}
                  required
                  placeholder="2"
                />
              </div>
            )}

            <div>
              <Input
                label="First Service Date *"
                type="date"
                value={formData.service_start_date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const warrantyEnd = getEffectiveWarrantyEndDate(product);
                  const autoVisits = computeVisitsFromWarranty(
                    newDate,
                    warrantyEnd,
                    formData.service_interval_type,
                    formData.service_interval_value,
                  );
                  setFormData((prev) => ({
                    ...prev,
                    service_start_date: newDate,
                    total_services: String(autoVisits),
                  }));
                }}
                required
              />
            </div>

            <div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300">
                    Total Visits *
                  </label>
                  <span className="text-[10px] font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                    Auto (Warranty)
                  </span>
                </div>
                <Input
                  type="number"
                  min="1"
                  value={formData.total_services}
                  onChange={(e) =>
                    handleChange("total_services", e.target.value)
                  }
                  required
                  placeholder="1"
                />
              </div>
            </div>

            <div>
              <Input
                label="Charge per Visit (₹)"
                type="number"
                min="0"
                step="1"
                value={formData.service_charge}
                onChange={(e) => handleChange("service_charge", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Service Description */}
        <div>
          <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
            Service Description (Optional)
          </label>
          <textarea
            value={formData.service_description}
            onChange={(e) =>
              handleChange("service_description", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
            rows="2"
            placeholder="Describe the service to be performed... (optional)"
          />
        </div>

        {/* Dynamic Derived Summary Preview */}
        {(() => {
          let delta = 1;
          const type = formData.service_interval_type || "MONTHLY";
          const val = Number(formData.service_interval_value) || 1;
          if (type === "QUARTERLY") delta = 3 * val;
          else if (type === "HALF_YEARLY") delta = 6 * val;
          else if (type === "YEARLY") delta = 12 * val;
          else delta = val;

          const total = Number(formData.total_services) || 1;
          const charge = parseFloat(formData.service_charge) || 0;
          const start = formData.service_start_date;
          let end = "";
          if (start) {
            const startDate = new Date(start);
            startDate.setMonth(startDate.getMonth() + delta * Math.max(total - 1, 0));
            end = startDate.toISOString().split("T")[0];
          }

          let cadenceText = "Every 1 month (Monthly)";
          if (type === "QUARTERLY") cadenceText = "Every 3 months (Quarterly)";
          else if (type === "HALF_YEARLY") cadenceText = "Every 6 months (Half-Yearly)";
          else if (type === "YEARLY") cadenceText = "Every 12 months (Yearly)";
          else if (type === "CUSTOM") cadenceText = `Every ${val} month${val > 1 ? "s" : ""}`;

          return (
            <div className="bg-gradient-to-r from-indigo-50/90 to-blue-50/70 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 p-3 rounded-lg text-xs space-y-1">
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

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner />
                Creating...
              </>
            ) : (
              <>
                <Calendar size={16} />
                Create Service Plan
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
