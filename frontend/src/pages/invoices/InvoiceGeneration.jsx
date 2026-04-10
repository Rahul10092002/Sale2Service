import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";
import { Button } from "../../components/ui/index.js";
import { ROUTES, INVOICE_CONSTANTS } from "../../utils/constants.js";
import {
  useInvoiceForm,
  useInvoiceActions,
} from "../../features/invoices/hooks.js";
import { useSaveMasterProductMutation } from "../../features/products/productApi.js";
import CustomerInformationForm from "../../components/invoice/CustomerInformationForm.jsx";
import InvoiceDetailsForm from "../../components/invoice/InvoiceDetailsForm.jsx";
import InvoiceItemsForm from "../../components/invoice/InvoiceItemsForm.jsx";
import InvoiceSummary from "../../components/invoice/InvoiceSummary.jsx";

const InvoiceGenerationPage = () => {
  const navigate = useNavigate();
  const {
    currentInvoice,
    errors,
    isSubmitting,
    reset,
    setErrors,
    setSubmitting,
    updateInvoiceData,
    recalculateInvoice,
  } = useInvoiceForm();

  const { createInvoice } = useInvoiceActions();
  const [saveMaster] = useSaveMasterProductMutation();
  const [submitResult, setSubmitResult] = useState(null);
  const [rawDiscount, setRawDiscount] = useState(null);

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

    if (!customer.address.city?.trim()) {
      newErrors["customer.address.city"] = "City is required";
    }

    if (!customer.address.state?.trim()) {
      newErrors["customer.address.state"] = "State is required";
    }

    if (!customer.address.pincode?.trim()) {
      newErrors["customer.address.pincode"] = "Pincode is required";
    }

    if (customer.email && !/\S+@\S+\.\S+/.test(customer.email)) {
      newErrors["customer.email"] = "Enter a valid email address";
    }

    // Invoice validation
    if (!invoice.invoice_date) {
      newErrors["invoice.invoice_date"] = "Invoice date is required";
    }

    // Payment status validation
    const { UNPAID, PARTIAL, PAID } = INVOICE_CONSTANTS.PAYMENT_STATUSES || {};
    if (
      invoice.payment_status === UNPAID ||
      invoice.payment_status === "UNPAID"
    ) {
      if (!invoice.due_date) {
        newErrors["invoice.due_date"] =
          "Due date is required for unpaid invoices";
      }
    }
    if (
      invoice.payment_status === PARTIAL ||
      invoice.payment_status === "PARTIAL"
    ) {
      if (!invoice.due_date) {
        newErrors["invoice.due_date"] =
          "Due date is required for partial payments";
      }
      if (!invoice.amount_paid || invoice.amount_paid <= 0) {
        newErrors["invoice.amount_paid"] =
          "Amount paid must be greater than 0 for partial payments";
      } else if (invoice.amount_paid >= invoice.total_amount) {
        newErrors["invoice.amount_paid"] =
          "Amount paid must be less than total amount for partial payments";
      }
    }

    // Products validation
    if (invoice_items.length === 0) {
      newErrors["general"] = "At least one product is required";
    } else {
      invoice_items.forEach((item) => {
        if (!item.serial_number?.trim()) {
          newErrors[`item.${item.id}.serial_number`] =
            "Serial number is required";
        }

        if (!item.product_name?.trim()) {
          newErrors[`item.${item.id}.product_name`] =
            "Product name is required";
        }

        if (!item.company?.trim()) {
          newErrors[`item.${item.id}.company`] = "Company/Brand is required";
        }

        if (!item.model_number?.trim()) {
          newErrors[`item.${item.id}.model_number`] =
            "Model number is required";
        }

        if (!item.selling_price || item.selling_price <= 0) {
          newErrors[`item.${item.id}.selling_price`] =
            "Valid selling price is required";
        }

        if (!item.warranty_start_date) {
          newErrors[`item.${item.id}.warranty_start_date`] =
            "Warranty start date is required";
        }

        if (item.product_category === INVOICE_CONSTANTS.PRODUCT_CATEGORIES.BATTERY) {
          if (!item.battery_type) {
            newErrors[`item.${item.id}.battery_type`] =
              "Battery type is required";
          }
          if (
            item.battery_type ===
            INVOICE_CONSTANTS.BATTERY_TYPES.VEHICLE_BATTERY
          ) {
            if (!item.vehicle_name?.trim()) {
              newErrors[`item.${item.id}.vehicle_name`] =
                "Vehicle name is required";
            }
            if (!item.vehicle_number_plate?.trim()) {
              newErrors[`item.${item.id}.vehicle_number_plate`] =
                "Number plate is required";
            }
          }
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentInvoice, setErrors]);

  // Submit invoice
  const handleSubmit = useCallback(async () => {
    if (!validateAllSections()) {
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const isPaid = currentInvoice.invoice.payment_status === "PAID";
      const payload = {
        customer: currentInvoice.customer,
        invoice: {
          ...currentInvoice.invoice,
          // Ensure correct amounts are sent for each payment status.
          // For PAID, we send full amount so backend sets amount_due=0 and due_date=null.
          amount_paid: isPaid
            ? Number(currentInvoice.invoice.total_amount || 0)
            : currentInvoice.invoice.payment_status === "PARTIAL"
            ? Number(currentInvoice.invoice.amount_paid || 0)
            : 0,
          // PAID invoices should not have due date
          due_date: isPaid ? null : currentInvoice.invoice.due_date,
          // Remove computed fields
          subtotal: undefined,
          tax: undefined,
          total_amount: undefined,
        },
        invoice_items: currentInvoice.invoice_items.map((item) => ({
          ...item,
          id: undefined, // Remove UI-only ID
          margin: undefined, // Remove computed field
        })),
      };

      const result = await createInvoice(payload).unwrap();
      setSubmitResult({ success: true, data: result });

      // Save all submitted items to ProductMaster with their final values.
      // Fire-and-forget: don't block success flow on these background saves.
      currentInvoice.invoice_items.forEach((item) => {
        if (item.product_name?.trim()) {
          saveMaster({
            product_name: item.product_name.trim(),
            product_category: item.product_category,
            company: item.company,
            model_number: item.model_number,
            selling_price: item.selling_price,
            capacity_rating: item.capacity_rating,
            voltage: item.voltage,
            warranty_type: item.warranty_type,
            warranty_duration_months: item.warranty_duration_months,
          }).catch(() => {}); // silent fail — non-critical
        }
      });

      // Clear the form state in Redux so customer/product details are removed
      reset();
    } catch (error) {
      console.error("Invoice creation failed:", error);
      setSubmitResult({
        success: false,
        error:
          error.data?.message || "Failed to create invoice. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    currentInvoice,
    validateAllSections,
    createInvoice,
    setSubmitting,
    reset,
    saveMaster,
  ]);

  // Show success message if invoice was created
  if (submitResult?.success) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Save className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Invoice Created Successfully!
              </h2>
              <p className="text-gray-600 mb-6">
                Invoice #{submitResult.data.invoice_number} has been created and
                saved.
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(
                      `${ROUTES.INVOICES}/${submitResult.data.invoice._id}`,
                    )
                  }
                >
                  View Invoice
                </Button>
                <Button
                  onClick={() => {
                    setSubmitResult(null);
                    reset();
                  }}
                >
                  Create Another
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Form Content */}
            <div className="lg:col-span-4 space-y-8">
              {/* Customer Information Section */}
              <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="">
                  <CustomerInformationForm />
                </div>
              </div>

              {/* Invoice Items Section */}
              <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="">
                  <InvoiceItemsForm />
                </div>
              </div>

              {/* Invoice Details Section */}
              <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="">
                  <InvoiceDetailsForm />
                </div>
              </div>
              <InvoiceSummary />

              {/* Submit Section */}
              <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    Review & Submit
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-slate-100 mt-1">
                    Apply discount and create the invoice
                  </p>
                </div>
                <div className="px-6 py-4">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div className="flex-1 max-w-xs">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-100 mb-2">
                        Discount Amount
                      </label>
                      <input
                        type="number"
                        value={
                          rawDiscount !== null
                            ? rawDiscount
                            : currentInvoice.invoice.discount || 0
                        }
                        onChange={(e) => {
                          setRawDiscount(e.target.value);
                          const discount = parseFloat(e.target.value) || 0;
                          updateInvoiceData({ discount });
                          setTimeout(() => recalculateInvoice(), 0);
                        }}
                        onBlur={() => setRawDiscount(null)}
                        placeholder="0.00"
                        min="0"
                        step="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      {Object.keys(errors).length > 0 && (
                        <div className="text-sm text-red-600 flex items-center gap-2">
                          <X className="w-4 h-4" />
                          Please fix the errors above
                        </div>
                      )}
                      {errors.general && (
                        <div className="text-sm text-red-600">
                          {errors.general}
                        </div>
                      )}
                      {submitResult?.error && (
                        <div className="text-sm text-red-600">
                          <strong>Error:</strong> {submitResult.error}
                        </div>
                      )}
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={
                          isSubmitting || Object.keys(errors).length > 0
                        }
                        className="flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Creating Invoice...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Create Invoice
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* <div className="lg:col-span-1">
              <div className="sticky top-6">
                <InvoiceSummary />
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceGenerationPage;
