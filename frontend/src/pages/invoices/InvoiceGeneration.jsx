import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Save, X, ChevronDown, ChevronUp, Calculator, ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/index.js";
import { ROUTES, INVOICE_CONSTANTS } from "../../utils/constants.js";
import {
  useInvoiceForm,
  useInvoiceActions,
} from "../../features/invoices/hooks.js";
import { useGetNextInvoiceNumberQuery } from "../../features/invoices/invoiceApi.js";
import { useGetCustomerByIdQuery } from "../../features/customers/customerApi.js";
import CustomerInformationForm from "../../components/invoice/CustomerInformationForm.jsx";
import InvoiceDetailsForm from "../../components/invoice/InvoiceDetailsForm.jsx";
import InvoiceItemsForm from "../../components/invoice/InvoiceItemsForm.jsx";
import InvoiceSummary from "../../components/invoice/InvoiceSummary.jsx";
import MobileInvoiceSummaryBar from "../../components/invoice/MobileInvoiceSummaryBar.jsx";

const InvoiceGenerationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("customer_id") || location.state?.customer_id;

  const {
    currentInvoice,
    errors,
    isSubmitting,
    reset,
    setErrors,
    setSubmitting,
    updateInvoiceData,
    updateCustomerData,
    updateCustomerAddressData,
  } = useInvoiceForm();

  const { data: customerResp } = useGetCustomerByIdQuery(customerId, {
    skip: !customerId,
  });

  useEffect(() => {
    if (customerResp?.customer) {
      const c = customerResp.customer;
      updateCustomerData({
        _id: c._id,
        full_name: c.full_name || "",
        whatsapp_number: c.whatsapp_number || "",
        email: c.email || "",
        alternate_phone: c.alternate_phone || "",
        customer_type: c.customer_type || "RETAIL",
        gst_number: c.gst_number || "",
        date_of_birth: c.date_of_birth || "",
        anniversary_date: c.anniversary_date || "",
        notes: c.notes || "",
      });
      if (c.address) {
        updateCustomerAddressData({
          line1: c.address.line1 || "",
          line2: c.address.line2 || "",
          city: c.address.city || "",
          state: c.address.state || "",
          pincode: c.address.pincode || "",
        });
      }
    }
  }, [customerResp, updateCustomerData, updateCustomerAddressData]);

  const { createInvoice } = useInvoiceActions();
  const [submitResult, setSubmitResult] = useState(null);
  const [rawDiscount, setRawDiscount] = useState(null);
  const [rawOldItemPrice, setRawOldItemPrice] = useState(null);
  const { data: nextInvoicePreview } = useGetNextInvoiceNumberQuery();

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);

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

    // Products / Services validation
    if (invoice_items.length === 0) {
      newErrors["general"] = "At least one product or service item is required";
    } else {
      invoice_items.forEach((item) => {
        if (item.item_type === "SERVICE") {
          if (!item.product_name?.trim()) {
            newErrors[`item.${item.id}.product_name`] =
              "Service title / description is required";
          }
          if (!item.selling_price || item.selling_price <= 0) {
            newErrors[`item.${item.id}.selling_price`] =
              "Valid service price is required";
          }
        } else {
          // PRODUCT validation
          if (!item.serial_number?.trim()) {
            newErrors[`item.${item.id}.serial_number`] =
              "Serial number is required";
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
        }
      });
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      setTimeout(() => {
        const errorSelector = [
          "[data-error='true']",
          "[aria-invalid='true']",
          ".border-danger",
          "p.text-danger",
          ".border-red-500",
        ].join(", ");

        const errorElements = Array.from(document.querySelectorAll(errorSelector));
        const visibleErrorEl =
          errorElements.find((el) => {
            const rect = el.getBoundingClientRect();
            return (
              rect.width > 0 ||
              rect.height > 0 ||
              (typeof el.getClientRects === "function" &&
                el.getClientRects().length > 0)
            );
          }) || errorElements[0];

        if (visibleErrorEl) {
          const focusTarget =
            visibleErrorEl.matches("input, select, textarea, button")
              ? visibleErrorEl
              : visibleErrorEl.querySelector("input, select, textarea, button") ||
                visibleErrorEl
                  .closest("div")
                  ?.querySelector("input, select, textarea, button") ||
                visibleErrorEl;

          focusTarget.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          if (typeof focusTarget.focus === "function") {
            try {
              focusTarget.focus({ preventScroll: true });
            } catch {
              focusTarget.focus();
            }
          }

          // Visual highlight ring effect
          focusTarget.classList.add("ring-2", "ring-danger", "ring-offset-2");
          setTimeout(() => {
            focusTarget.classList.remove("ring-2", "ring-danger", "ring-offset-2");
          }, 2000);
        }
      }, 120);
    }
    return isValid;
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
      const invoiceData = { ...currentInvoice.invoice };
      delete invoiceData.invoice_number;

      const payload = {
        customer: currentInvoice.customer,
        invoice: {
          ...invoiceData,
          amount_paid: isPaid
            ? Number(currentInvoice.invoice.total_amount || 0)
            : currentInvoice.invoice.payment_status === "PARTIAL"
            ? Number(currentInvoice.invoice.amount_paid || 0)
            : 0,
          due_date: isPaid ? null : currentInvoice.invoice.due_date,
          discount: Number(currentInvoice.invoice.discount || 0),
          old_item_exchange_price: Number(
            currentInvoice.invoice.old_item_exchange_price || 0,
          ),
          subtotal: Number(currentInvoice.invoice.subtotal || 0),
          tax: Number(currentInvoice.invoice.tax || 0),
          total_amount: Number(currentInvoice.invoice.total_amount || 0),
        },
        invoice_items: currentInvoice.invoice_items.map((item) => ({
          ...item,
          id: undefined, // Remove UI-only ID
          margin: undefined, // Remove computed field
        })),
      };

      const result = await createInvoice(payload).unwrap();
      setSubmitResult({ success: true, data: result });

      // Clear the form state in Redux so customer/product details are removed
      reset();
    } catch (error) {
      console.error("Invoice creation failed:", error);
      setSubmitResult({
        success: false,
        error:
          error.data?.message || "Failed to create invoice. Please try again.",
        details: Array.isArray(error.data?.errors) ? error.data.errors : [],
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
  ]);

  // Show success message if invoice was created
  if (submitResult?.success) {
    return (
      <>
        <div className="compact min-h-screen bg-gray-50 dark:bg-dark-bg py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Save className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Invoice Created Successfully!
              </h2>
              <div className="text-gray-600 mb-6 space-y-2">
                <p>
                  Invoice #{submitResult.data.invoice_number} for{" "}
                  {submitResult.data.invoice?.customer_id?.full_name ||
                    currentInvoice.customer.full_name ||
                    "this customer"}{" "}
                  has been saved.
                </p>
                <p>
                  Total: {formatCurrency(submitResult.data.total_amount)}.
                  {" "}Amount due: {formatCurrency(submitResult.data.amount_due)}.
                </p>
                {submitResult.data.pdf_error && (
                  <p className="text-amber-700">
                    PDF generation needs attention: {submitResult.data.pdf_error}
                  </p>
                )}
              </div>
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
      <div className="compact min-h-screen bg-gray-50 dark:bg-dark-bg py-3 pb-36 lg:pb-8">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Mobile Top Context & Navigation Bar */}
          <div className="flex items-center justify-between gap-2 mb-3 lg:hidden bg-white dark:bg-dark-card p-2.5 rounded-xl border border-gray-200/90 dark:border-dark-border shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(ROUTES.INVOICES)}
                className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Invoices</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-1 px-2 active:scale-95 transition-all"
              >
                Dashboard
              </button>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
              New Invoice
            </span>
          </div>

          {/* Main Form Content */}
          <div className="space-y-4">
            {/* Customer Information Section */}
            <CustomerInformationForm />

              {/* Invoice Items Section */}
              <InvoiceItemsForm />

              {/* Invoice Details Section */}
              <InvoiceDetailsForm />

              {/* Desktop Summary (lg screens only to avoid duplicate clutter on mobile) */}
              <div className="hidden lg:block">
                <InvoiceSummary />
              </div>

              {/* Review & Submit Section */}
              <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200/90 dark:border-dark-border shadow-xs overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-dark-border/60 bg-gray-50/60 dark:bg-dark-card">
                  <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">
                    Review & Submit
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    Apply discount, set tax inclusion, and create invoice
                  </p>
                </div>
                <div className="px-3 py-3">
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-slate-200">
                    {nextInvoicePreview?.invoice_number && (
                      <span className="rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold px-3 py-1 border border-indigo-200 dark:border-indigo-800">
                        Next Invoice: {nextInvoicePreview.invoice_number}
                      </span>
                    )}
                    <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800 font-semibold">
                      Current Total: {formatCurrency(currentInvoice.invoice.total_amount)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800 font-semibold">
                      Amount Due: {formatCurrency(currentInvoice.invoice.amount_due)}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div className="flex flex-wrap gap-4 sm:gap-6 items-end flex-1">
                      <div className="max-w-xs w-full sm:w-auto">
                        <label className="block text-xs font-bold text-gray-700 dark:text-slate-100 mb-1">
                          Discount Amount (₹)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={
                            rawDiscount !== null
                              ? rawDiscount
                              : currentInvoice.invoice.discount || 0
                          }
                          onChange={(e) => {
                            setRawDiscount(e.target.value);
                            const discount = parseFloat(e.target.value) || 0;
                            updateInvoiceData({ discount });
                          }}
                          onBlur={() => setRawDiscount(null)}
                          placeholder="0.00"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-input rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                        />
                      </div>

                      <div className="max-w-xs w-full sm:w-auto">
                        <label className="block text-xs font-bold text-gray-700 dark:text-slate-100 mb-1">
                          Old Item / Battery Exchange (₹)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={
                            rawOldItemPrice !== null
                              ? rawOldItemPrice
                              : currentInvoice.invoice.old_item_exchange_price || 0
                          }
                          onChange={(e) => {
                            setRawOldItemPrice(e.target.value);
                            const old_item_exchange_price =
                              parseFloat(e.target.value) || 0;
                            updateInvoiceData({ old_item_exchange_price });
                          }}
                          onBlur={() => setRawOldItemPrice(null)}
                          placeholder="0.00"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-input rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                        />
                      </div>

                      <div className="flex items-center mb-2 sm:mb-0 h-[42px]">
                        <label className="flex items-center cursor-pointer gap-3">
                          <span className="text-xs font-bold text-gray-700 dark:text-slate-100">
                            Tax {currentInvoice.invoice.is_tax_inclusive !== false ? "Inclusive" : "Exclusive"}
                          </span>

                          <div className="relative w-10 h-6">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={currentInvoice.invoice.is_tax_inclusive !== false}
                              onChange={(e) => {
                                updateInvoiceData({ is_tax_inclusive: e.target.checked });
                              }}
                            />

                            {/* Track */}
                            <div className="w-full h-full rounded-full bg-gray-300 dark:bg-slate-600 peer-checked:bg-indigo-600 transition-colors"></div>

                            {/* Thumb */}
                            <div className="absolute top-1/2 left-[2px] -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-xs transition-transform duration-200 ease-in-out peer-checked:translate-x-[18px]"></div>
                          </div>
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {Object.keys(errors).length > 0 && (
                        <div className="text-sm text-red-600 flex items-center gap-2 font-medium">
                          <X className="w-4 h-4" />
                          Please fix the errors above
                        </div>
                      )}
                      {errors.general && (
                        <div className="text-sm text-red-600 font-medium">
                          {errors.general}
                        </div>
                      )}
                      {submitResult?.error && (
                        <div className="text-sm text-red-600 space-y-1">
                          <strong>Error:</strong> {submitResult.error}
                          {submitResult.details?.length > 0 && (
                            <ul className="list-disc pl-5">
                              {submitResult.details.map((detail) => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={
                          isSubmitting || Object.keys(errors).length > 0
                        }
                        className="flex items-center justify-center gap-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl"
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
          </div>

        {/* Mobile Sticky Bottom Action Bar (< lg screens) */}
        <MobileInvoiceSummaryBar
          invoice={currentInvoice.invoice}
          items={currentInvoice.invoice_items}
          rawDiscount={rawDiscount}
          setRawDiscount={setRawDiscount}
          rawOldItemPrice={rawOldItemPrice}
          setRawOldItemPrice={setRawOldItemPrice}
          updateInvoiceData={updateInvoiceData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errors={errors}
          submitError={submitResult?.error}
          submitLabel="Create Invoice"
          loadingLabel="Creating Invoice..."
        />
      </div>
    </>
  );
};

export default InvoiceGenerationPage;
