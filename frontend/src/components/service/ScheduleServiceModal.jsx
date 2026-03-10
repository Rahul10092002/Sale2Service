import React, { useState } from "react";
import { Plus, Calendar, Wrench, AlertCircle } from "lucide-react";
import { Dialog as Modal, DialogHeader, DialogBody } from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import SelectField from "../ui/SelectField.jsx";
import LoadingSpinner from "../ui/LoadingSpinner.jsx";

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
  const [formData, setFormData] = useState({
    service_interval_type: "MONTHLY",
    service_interval_value: "6",
    service_start_date: "",
    total_services: "1",
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
          Authorization: `Bearer ${localStorage.getItem("token")}`,
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
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">
            Product Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Product:</span>
              <span className="ml-2 font-medium">{product?.product_name}</span>
            </div>
            {product?.serial_number && (
              <div>
                <span className="text-gray-600">Serial:</span>
                <span className="ml-2 font-medium">
                  {product.serial_number}
                </span>
              </div>
            )}
            {product?.company && (
              <div>
                <span className="text-gray-600">Brand:</span>
                <span className="ml-2 font-medium">{product.company}</span>
              </div>
            )}
            {product?.model_number && (
              <div>
                <span className="text-gray-600">Model:</span>
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

        {/* Service Interval */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Service Schedule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              label="Interval Value"
              value={formData.service_interval_value}
              onChange={(value) =>
                handleChange("service_interval_value", value)
              }
              options={intervalValueOptions}
              required
            />
            <SelectField
              label="Interval Type"
              value={formData.service_interval_type}
              onChange={(value) => handleChange("service_interval_type", value)}
              options={intervalOptions}
              required
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Service will be scheduled every {formData.service_interval_value}{" "}
            {formData.service_interval_type}(s)
          </p>
        </div>

        {/* Service Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={formData.service_start_date}
            onChange={(e) => handleChange("service_start_date", e.target.value)}
            required
            min={new Date().toISOString().split("T")[0]}
          />
          <SelectField
            label="Total Services"
            value={formData.total_services}
            onChange={(value) => handleChange("total_services", value)}
            options={totalServicesOptions}
            required
          />
        </div>

        {/* Service Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Description
          </label>
          <textarea
            value={formData.service_description}
            onChange={(e) =>
              handleChange("service_description", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            placeholder="Describe the service to be performed..."
          />
        </div>

        {/* Service Charge */}
        <div>
          <Input
            label="Service Charge (Optional)"
            type="number"
            value={formData.service_charge}
            onChange={(e) => handleChange("service_charge", e.target.value)}
            min="0"
            step="0.01"
            placeholder="0.00"
          />
          <p className="text-sm text-gray-600 mt-1">
            Charge per service visit (leave 0 for free service)
          </p>
        </div>

        {/* Preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Service Plan Preview
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              <strong>Schedule:</strong> Every {formData.service_interval_value}{" "}
              {formatIntervalType(formData.service_interval_type)}(s), starting{" "}
              {formData.service_start_date
                ? new Date(formData.service_start_date).toLocaleDateString()
                : "TBD"}
            </p>
            <p>
              <strong>Total Services:</strong> {formData.total_services}{" "}
              service(s)
            </p>
            {formData.service_charge && Number(formData.service_charge) > 0 && (
              <p>
                <strong>Charge:</strong> ₹
                {Number(formData.service_charge).toFixed(2)} per service
              </p>
            )}
          </div>
        </div>

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
