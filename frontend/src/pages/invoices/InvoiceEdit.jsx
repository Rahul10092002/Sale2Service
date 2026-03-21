import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Save, X, ArrowLeft } from "lucide-react";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
import { useInvoiceForm } from "../../features/invoices/hooks.js";
import {
  useGetInvoiceByIdQuery,
  useUpdateInvoiceMutation,
} from "../../features/invoices/invoiceApi.js";
import CustomerInformationForm from "../../components/invoice/CustomerInformationForm.jsx";
import InvoiceDetailsForm from "../../components/invoice/InvoiceDetailsForm.jsx";
import InvoiceItemsForm from "../../components/invoice/InvoiceItemsForm.jsx";
import InvoiceSummary from "../../components/invoice/InvoiceSummary.jsx";
import { ROUTES } from "../../utils/constants.js";

const InvoiceEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: existingInvoice,
    isLoading: isLoadingInvoice,
    error: loadError,
  } = useGetInvoiceByIdQuery(id);

  // Support responses that return either an invoice object or { invoice, invoice_items }
  const source = existingInvoice?.invoice
    ? existingInvoice.invoice
    : existingInvoice || {};
  const items = existingInvoice?.invoice_items
    ? existingInvoice.invoice_items
    : source.invoice_items || [];

  const {
    currentInvoice,
    errors,
    isSubmitting,
    reset,
    setErrors,
    setSubmitting,
    updateInvoiceData,
    recalculateInvoice,
    setInvoiceData,
  } = useInvoiceForm();

  const [updateInvoice] = useUpdateInvoiceMutation();
  const [submitResult, setSubmitResult] = useState(null);

  // Load existing invoice data into form when available
  useEffect(() => {
    if (existingInvoice && !isLoadingInvoice) {
      // Support responses that return either an invoice object or { invoice, invoice_items }
      const source = existingInvoice.invoice
        ? existingInvoice.invoice
        : existingInvoice;
      const items = existingInvoice.invoice_items
        ? existingInvoice.invoice_items
        : source.invoice_items || [];

      const formattedInvoice = {
        customer: {
          full_name: source.customer_id?.full_name || "",
          whatsapp_number: source.customer_id?.whatsapp_number || "",
          address: {
            line1:
              source.customer_id?.address?.line1 ||
              source.customer_id?.address ||
              "",
            city: source.customer_id?.address?.city || "",
            state: source.customer_id?.address?.state || "",
            postal_code: source.customer_id?.address?.pincode || "",
          },
        },
        invoice: {
          invoice_number: source.invoice_number || "",
          invoice_date: source.invoice_date
            ? new Date(source.invoice_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          payment_mode: source.payment_mode || "CASH",
          payment_status: source.payment_status || "UNPAID",
          discount: source.discount || 0,
          warranty_months: source.warranty_months || 0,
          notes: source.notes || "",
        },
        invoice_items:
          items.map((item, index) => ({
            id: Date.now() + Math.random() + index,
            product_name: item.product_name || "",
            serial_number: item.serial_number || "",
            selling_price: item.selling_price ?? item.price ?? 0,
            quantity: item.quantity || 1,
            product_category: item.product_category || "BATTERY",
            company: item.company || "",
            model_number: item.model_number || "",
            warranty_type: item.warranty_type || "STANDARD",
            warranty_start_date: item.warranty_start_date
              ? new Date(item.warranty_start_date).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            warranty_duration_months: item.warranty_duration_months || 12,
            warranty_end_date: item.warranty_end_date || "",
            pro_warranty_end_date: item.pro_warranty_end_date || "",
            manufacturing_date: item.manufacturing_date || "",
            capacity_rating: item.capacity_rating || "",
            voltage: item.voltage || "",
            batch_number: item.batch_number || "",
            purchase_source: item.purchase_source || "",
            cost_price: item.cost_price || 0,
            // Include service plan data
            service_plan_enabled: item.service_plan_enabled || false,
            service_plan: item.service_plan || null,
          })) || [],
      };

      setInvoiceData(formattedInvoice);
    }
  }, [existingInvoice, isLoadingInvoice, setInvoiceData]);

  // Comprehensive validation for all sections
  const validateAllSections = useCallback(() => {
    const newErrors = {};
    const { customer, invoice, invoice_items } = currentInvoice;

    // Customer validation
    if (!customer.full_name?.trim()) {
      newErrors["customer.full_name"] = "Full name is required";
    }

    if (!customer.whatsapp_number?.trim()) {
      newErrors["customer.whatsapp_number"] = "WhatsApp number is required";
    } else if (!/^\+?[\d\s-()]{10,15}$/.test(customer.whatsapp_number)) {
      newErrors["customer.whatsapp_number"] = "Enter a valid WhatsApp number";
    }

    if (!customer.address.line1?.trim()) {
      newErrors["customer.address.line1"] = "Address is required";
    }

    // Invoice validation
    if (!invoice.invoice_number?.trim()) {
      newErrors["invoice.invoice_number"] = "Invoice number is required";
    }

    if (!invoice.invoice_date) {
      newErrors["invoice.invoice_date"] = "Invoice date is required";
    }

    if (!invoice.payment_mode) {
      newErrors["invoice.payment_mode"] = "Payment mode is required";
    }

    if (!invoice.payment_status) {
      newErrors["invoice.payment_status"] = "Payment status is required";
    }

    // Invoice items validation
    if (!invoice_items || invoice_items.length === 0) {
      newErrors["invoice_items"] = "At least one invoice item is required";
    } else {
      invoice_items.forEach((item, index) => {
        if (!item.product_name?.trim()) {
          newErrors[`item.${item.id}.product_name`] =
            "Product name is required";
        }
        if (!item.serial_number?.trim()) {
          newErrors[`item.${item.id}.serial_number`] =
            "Serial number is required";
        }
        if (!item.selling_price || item.selling_price <= 0) {
          newErrors[`item.${item.id}.selling_price`] =
            "Price must be greater than 0";
        }
      });
    }

    return newErrors;
  }, [currentInvoice]);

  const handleSaveInvoice = async () => {
    try {
      setSubmitting(true);
      setSubmitResult(null);

      // Validate all sections
      const validationErrors = validateAllSections();

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setSubmitResult({
          success: false,
          message: "Please fix the validation errors before saving",
        });
        return;
      }

      // Clear any existing errors
      setErrors({});

      // Prepare invoice data for submission
      const invoiceData = {
        customer: {
          full_name: currentInvoice.customer.full_name,
          whatsapp_number: currentInvoice.customer.whatsapp_number,
          address: currentInvoice.customer.address.line1,
        },
        invoice: {
          invoice_number: currentInvoice.invoice.invoice_number,
          invoice_date: currentInvoice.invoice.invoice_date,
          payment_mode: currentInvoice.invoice.payment_mode,
          payment_status: currentInvoice.invoice.payment_status,
          discount: parseFloat(currentInvoice.invoice.discount || 0),
          warranty_months: parseInt(
            currentInvoice.invoice.warranty_months || 0,
          ),
          notes: currentInvoice.invoice.notes,
        },
        invoice_items: currentInvoice.invoice_items.map((item) => ({
          product_name: item.product_name,
          serial_number: item.serial_number,
          price: parseFloat(item.selling_price),
          selling_price: parseFloat(item.selling_price),
          cost_price: parseFloat(item.cost_price || 0),
          quantity: parseInt(item.quantity || 1),
          product_category: item.product_category || "BATTERY",
          company: item.company || "",
          model_number: item.model_number || "",
          warranty_type: item.warranty_type || "STANDARD",
          warranty_start_date: item.warranty_start_date,
          warranty_duration_months: parseInt(
            item.warranty_duration_months || 12,
          ),
          warranty_end_date: item.warranty_end_date,
          pro_warranty_end_date: item.pro_warranty_end_date,
          manufacturing_date: item.manufacturing_date,
          capacity_rating: item.capacity_rating,
          voltage: item.voltage,
          batch_number: item.batch_number,
          purchase_source: item.purchase_source,
          notes: item.notes,
          // Include service plan data
          service_plan_enabled: item.service_plan_enabled || false,
          service_plan:
            item.service_plan_enabled && item.service_plan
              ? {
                  service_interval_type:
                    item.service_plan.service_interval_type,
                  service_interval_value: parseInt(
                    item.service_plan.service_interval_value || 1,
                  ),
                  total_services: parseInt(
                    item.service_plan.total_services || 1,
                  ),
                  service_start_date: item.service_plan.service_start_date,
                  service_end_date: item.service_plan.service_end_date,
                  service_description:
                    item.service_plan.service_description || "",
                  service_charge: parseFloat(
                    item.service_plan.service_charge || 0,
                  ),
                  is_active: item.service_plan.is_active !== false,
                }
              : null,
        })),
      };

      // Submit to backend
      const response = await updateInvoice({
        id,
        ...invoiceData,
      }).unwrap();

      setSubmitResult({
        success: true,
        message: "Invoice updated successfully!",
        data: response,
      });

      // Navigate to invoice view after successful update
      setTimeout(() => {
        navigate(`${ROUTES.INVOICES}/${id}`);
      }, 1500);
    } catch (error) {
      console.error("Update invoice error:", error);
      setSubmitResult({
        success: false,
        message:
          error?.data?.message || "Failed to update invoice. Please try again.",
        error: error,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel? All changes will be lost.",
      )
    ) {
      navigate(`${ROUTES.INVOICES}/${id}`);
    }
  };

  if (isLoadingInvoice) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (loadError || !existingInvoice) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Invoice not found
              </h3>
              <p className="text-gray-500 mb-6">
                The invoice you're trying to edit doesn't exist or has been
                deleted.
              </p>
              <Link to={ROUTES.INVOICES}>
                <Button>Back to Invoices</Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <Link to={`${ROUTES.INVOICES}/${id}`}>
                <Button variant="outline" size="sm" className="p-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Edit Invoice{" "}
                  {source.invoice_number ||
                    currentInvoice.invoice.invoice_number}
                </h1>
                <p className="text-gray-600 mt-2">
                  Update invoice details and customer information
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveInvoice}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <LoadingSpinner className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSubmitting ? "Updating..." : "Update Invoice"}
              </Button>
            </div>
          </div>

          {/* Submit Result */}
          {submitResult && (
            <div className="mb-6">
              <div
                className={`p-4 rounded-lg ${
                  submitResult.success
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                <p className="font-medium">{submitResult.message}</p>
                {submitResult.error && (
                  <p className="text-sm mt-1 opacity-75">
                    {submitResult.error?.data?.message || "Please try again."}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <CustomerInformationForm
                customerData={currentInvoice.customer}
                updateCustomerData={(updates) =>
                  updateInvoiceData("customer", updates)
                }
                errors={errors}
              />

              {/* Invoice Details */}
              <InvoiceDetailsForm
                invoiceData={currentInvoice.invoice}
                updateInvoiceData={(updates) =>
                  updateInvoiceData("invoice", updates)
                }
                errors={errors}
              />

              {/* Invoice Items */}
              <InvoiceItemsForm
                invoiceItems={currentInvoice.invoice_items}
                updateInvoiceItems={(items) =>
                  updateInvoiceData("invoice_items", items)
                }
                errors={errors}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Invoice Summary */}
              <InvoiceSummary
                invoiceItems={currentInvoice.invoice_items}
                discount={currentInvoice.invoice.discount}
                onDiscountChange={(discount) =>
                  updateInvoiceData("invoice", { discount })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceEdit;
