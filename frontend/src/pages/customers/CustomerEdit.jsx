import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "../../features/ui/uiSlice.js";
import { ArrowLeft, Save, X, Globe } from "lucide-react";
import {
  useGetCustomerByIdQuery,
  useUpdateCustomerMutation,
} from "../../features/customers/customerApi.js";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { ROUTES } from "../../utils/constants.js";

const CustomerEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: customerResp, isLoading, error } = useGetCustomerByIdQuery(id);

  const [updateCustomer] = useUpdateCustomerMutation();

  const [formData, setFormData] = useState({
    full_name: "",
    whatsapp_number: "",
    alternate_phone: "",
    email: "",
    date_of_birth: "",
    anniversary_date: "",
    gst_number: "",
    customer_type: "RETAIL",
    preferred_language: "ENGLISH",
    notes: "",
    address: { line1: "", line2: "", city: "", state: "", pincode: "" },
  });

  // Populate form when customer data is loaded
  useEffect(() => {
    if (customerResp?.customer) {
      const customer = customerResp.customer;
      setFormData({
        full_name: customer.full_name || "",
        whatsapp_number: customer.whatsapp_number || "",
        alternate_phone: customer.alternate_phone || "",
        email: customer.email || "",
        date_of_birth: customer.date_of_birth?.split("T")[0] || "",
        anniversary_date: customer.anniversary_date?.split("T")[0] || "",
        gst_number: customer.gst_number || "",
        customer_type: customer.customer_type || "RETAIL",
        preferred_language: customer.preferred_language || "ENGLISH",
        notes: customer.notes || "",
        address: {
          line1: customer.address?.line1 || "",
          line2: customer.address?.line2 || "",
          city: customer.address?.city || "",
          state: customer.address?.state || "",
          pincode: customer.address?.pincode || "",
        },
      });
    }
  }, [customerResp]);

  const showAlert = (message, type = "success") => {
    dispatch(showToast({ message, type }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // support nested address fields using dot notation
    if (name && name.startsWith("address.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateCustomer({ id, ...formData }).unwrap();
      showAlert("Customer updated successfully", "success");
      setTimeout(() => navigate(`${ROUTES.CUSTOMERS}/${id}`), 1000);
    } catch (err) {
      console.error("Update customer error:", err);
      showAlert(err?.data?.message || "Failed to update customer", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`${ROUTES.CUSTOMERS}/${id}`);
  };

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <Alert type="error" message="Failed to load customer data" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${ROUTES.CUSTOMERS}/${id}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Customer
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Edit Customer</h1>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Basic Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Full Name *"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="WhatsApp Number *"
                  name="whatsapp_number"
                  type="tel"
                  value={formData.whatsapp_number}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="Alternate Phone"
                  name="alternate_phone"
                  type="tel"
                  value={formData.alternate_phone}
                  onChange={handleInputChange}
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                <Input
                  label="Date of Birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                />
                <Input
                  label="Anniversary Date"
                  name="anniversary_date"
                  type="date"
                  value={formData.anniversary_date}
                  onChange={handleInputChange}
                />
                <Input
                  label="GST Number"
                  name="gst_number"
                  type="text"
                  value={formData.gst_number}
                  onChange={handleInputChange}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Type
                  </label>
                  <select
                    name="customer_type"
                    value={formData.customer_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="BUSINESS">Business</option>
                    <option value="DEALER">Dealer</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    Preferred Language
                  </label>
                  <select
                    name="preferred_language"
                    value={formData.preferred_language}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ENGLISH">English</option>
                    <option value="HINDI">Hindi</option>
                    <option value="TAMIL">Tamil</option>
                    <option value="TELUGU">Telugu</option>
                    <option value="KANNADA">Kannada</option>
                    <option value="MALAYALAM">Malayalam</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Address
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Address Line 1"
                  name="address.line1"
                  type="text"
                  value={formData.address.line1}
                  onChange={handleInputChange}
                />
                <Input
                  label="Address Line 2"
                  name="address.line2"
                  type="text"
                  value={formData.address.line2}
                  onChange={handleInputChange}
                />
                <Input
                  label="City"
                  name="address.city"
                  type="text"
                  value={formData.address.city}
                  onChange={handleInputChange}
                />
                <Input
                  label="State"
                  name="address.state"
                  type="text"
                  value={formData.address.state}
                  onChange={handleInputChange}
                />
                <Input
                  label="Pincode"
                  name="address.pincode"
                  type="text"
                  value={formData.address.pincode}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about the customer..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CustomerEdit;
