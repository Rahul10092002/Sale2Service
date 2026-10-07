import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Save, X, ArrowLeft, ChevronDown, ChevronUp, Calculator } from "lucide-react";
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
import MobileInvoiceSummaryBar from "../../components/invoice/MobileInvoiceSummaryBar.jsx";
import { ROUTES, INVOICE_CONSTANTS } from "../../utils/constants.js";

const InvoiceEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: existingInvoice,
    isLoading: isLoadingInvoice,
    error: loadError,
  } = useGetInvoiceByIdQuery(id);

  const {
    currentInvoice,
    errors,
    isSubmitting,
    reset,
    setErrors,
    setSubmitting,
    updateInvoiceData,
    setInvoiceData,
  } = useInvoiceForm();

  const [updateInvoice] = useUpdateInvoiceMutation();
  const [submitResult, setSubmitResult] = useState(null);
  const [rawDiscount, setRawDiscount] = useState(null);
  const [rawOldItemPrice, setRawOldItemPrice] = useState(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  const source = existingInvoice?.invoice
    ? existingInvoice.invoice
    : existingInvoice || {};

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);

  // Hydrate existing invoice data into Redux store
  useEffect(() => {
    if (existingInvoice && !isLoadingInvoice && !hasHydrated) {
      const src = existingInvoice.invoice
        ? existingInvoice.invoice
        : existingInvoice;
      const cust = src.customer_id || src.customer || {};

      const productItems = (
        existingInvoice.invoice_items
          ? existingInvoice.invoice_items
          : src.invoice_items || []
      ).map((i) => ({ ...i, item_type: i.item_type || "PRODUCT" }));

      const serviceItems = (src.services || []).map((s) => ({
        ...s,
        item_type: "SERVICE",
      }));

      const items = [...productItems, ...serviceItems];

      const formattedInvoice = {
        customer: {
          _id: cust._id || "",
          full_name: cust.full_name || "",
          whatsapp_number: cust.whatsapp_number || "",
          alternate_phone: cust.alternate_phone || "",
          email: cust.email || "",
          date_of_birth: cust.date_of_birth || "",
          anniversary_date: cust.anniversary_date || "",
          preferred_language: cust.preferred_language || "ENGLISH",
          gst_number: cust.gst_number || "",
          customer_type: cust.customer_type || "RETAIL",
          notes: cust.notes || "",
          address: {
            line1:
              cust.address?.line1 ||
              (typeof cust.address === "string" ? cust.address : ""),
            line2: cust.address?.line2 || "",
            city: cust.address?.city || "",
            state: cust.address?.state || "",
            pincode: cust.address?.pincode || "",
          },
        },
        invoice: {
          invoice_number: src.invoice_number || "",
          invoice_date: src.invoice_date
            ? new Date(src.invoice_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          payment_mode: src.payment_mode || "CASH",
          payment_status: src.payment_status || "UNPAID",
          is_tax_inclusive: src.is_tax_inclusive !== false,
          subtotal: src.subtotal || 0,
          discount: src.discount || 0,
          old_item_exchange_price: src.old_item_exchange_price || 0,
          tax: src.tax || 0,
          total_amount: src.total_amount || 0,
          amount_paid: src.amount_paid || 0,
          amount_due: src.amount_due || 0,
          due_date: src.due_date
            ? new Date(src.due_date).toISOString().split("T")[0]
            : "",
          warranty_months: src.warranty_months || 0,
          notes: src.notes || "",
        },
        invoice_items: items.map((item, index) => ({
          id: Date.now() + Math.random() + index,
          item_type: item.item_type || "PRODUCT",
          service_category: item.service_category || "REPAIR",
          product_name: item.product_name || "",
          serial_number: item.serial_number || "",
          selling_price: item.selling_price ?? item.price ?? 0,
          quantity: item.quantity || 1,
          product_category:
            item.product_category ||
            (item.item_type === "SERVICE" ? "OTHER" : "BATTERY"),
          battery_type:
            item.product_category === "BATTERY" && !item.battery_type
              ? INVOICE_CONSTANTS.BATTERY_TYPES.INVERTER_BATTERY
              : item.battery_type || "",
          vehicle_name: item.vehicle_name || "",
          vehicle_number_plate: item.vehicle_number_plate || "",
          company: item.company || "",
          model_number: item.model_number || "",
          warranty_type: item.warranty_type || "STANDARD",
          warranty_start_date: item.warranty_start_date
            ? new Date(item.warranty_start_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          warranty_duration_months: item.warranty_duration_months || 0,
          warranty_end_date: item.warranty_end_date || "",
          pro_warranty_end_date: item.pro_warranty_end_date || "",
          notes: item.notes || "",
          product_images: item.product_images || [],
        })),
      };

      setInvoiceData(formattedInvoice);
      setHasHydrated(true);
    }
  }, [existingInvoice, isLoadingInvoice, hasHydrated, setInvoiceData]);

  // Validation function matching InvoiceGeneration.jsx
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

    if (customer.email && !/\S+@\S+\.\S+/.test(customer.email)) {
      newErrors["customer.email"] = "Enter a valid email address";
    }

    // Invoice validation
    if (!invoice.invoice_date) {
      newErrors["invoice.invoice_date"] = "Invoice date is required";
    }

    // Payment validation
    const { UNPAID, PARTIAL } = INVOICE_CONSTANTS.PAYMENT_STATUSES || {};
    if (invoice.payment_status === UNPAID || invoice.payment_status === "UNPAID") {
      if (!invoice.due_date) {
        newErrors["invoice.due_date"] =
          "Due date is required for unpaid invoices";
      }
    }
    if (invoice.payment_status === PARTIAL || invoice.payment_status === "PARTIAL") {
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

    // Invoice items validation
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
          const isNoSerial = Boolean(
            item.has_no_serial ||
              (item.serial_number && item.serial_number.startsWith("NS-")),
          );

          if (!isNoSerial && !item.serial_number?.trim()) {
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

          focusTarget.classList.add("ring-2", "ring-danger", "ring-offset-2");
          setTimeout(() => {
            focusTarget.classList.remove("ring-2", "ring-danger", "ring-offset-2");
          }, 2000);
        }
      }, 120);
    }

    return isValid;
  }, [currentInvoice, setErrors]);

  const handleSaveInvoice = async () => {
    if (!validateAllSections()) {
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const isPaid = currentInvoice.invoice.payment_status === "PAID";
      const invoiceData = { ...currentInvoice.invoice };

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

      // Submit to backend
      const response = await updateInvoice({
        id,
        ...payload,
      }).unwrap();

      setSubmitResult({
        success: true,
        message: "Invoice updated successfully!",
        data: response,
      });

      // Navigate to invoice view after successful update
      setTimeout(() => {
        navigate(`${ROUTES.INVOICES}/${id}`);
      }, 1200);
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
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !existingInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
              Invoice not found
            </h3>
            <p className="text-ink-secondary dark:text-slate-400 mb-6">
              The invoice you're trying to edit doesn't exist or has been deleted.
            </p>
            <Link to={ROUTES.INVOICES}>
              <Button>Back to Invoices</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="compact min-h-screen bg-gray-50 dark:bg-dark-bg py-3 pb-36 lg:pb-8">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Top Desktop Navigation & Action Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3 bg-white dark:bg-dark-card p-3 rounded-2xl border border-gray-200/90 dark:border-dark-border shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="p-2 border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-slate-300" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Edit Invoice #{source.invoice_number || currentInvoice.invoice.invoice_number}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Update customer information, invoice items, and payment details
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="text-xs h-9 px-3.5"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveInvoice}
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className="text-xs h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-1.5" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Update Invoice
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Top Navigation Context Bar */}
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
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50">
              Edit Mode
            </span>
          </div>

          {/* Submit Result Message */}
          {submitResult && (
            <div className="mb-4">
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold ${
                  submitResult.success
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                {submitResult.message}
              </div>
            </div>
          )}

          {/* Main Form Content (Structured identically to InvoiceGeneration.jsx) */}
          <div className="space-y-4">
            {/* 1. Customer Information Section */}
            <CustomerInformationForm />

            {/* 2. Invoice Items Section */}
            <InvoiceItemsForm />

            {/* 3. Invoice Details Section */}
            <InvoiceDetailsForm />

            {/* 4. Desktop Summary */}
            <div className="hidden lg:block">
              <InvoiceSummary />
            </div>

            {/* 5. Review & Submit Section (Includes Old Item Exchange Input) */}
            <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200/90 dark:border-dark-border shadow-xs overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-dark-border/60 bg-gray-50/60 dark:bg-dark-card">
                <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">
                  Review & Update
                </h2>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                  Apply discount, set exchange price, and update invoice
                </p>
              </div>
              <div className="px-3 py-3">
                <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-slate-200">
                  <span className="rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold px-3 py-1 border border-indigo-200 dark:border-indigo-800">
                    Editing #{source.invoice_number || currentInvoice.invoice.invoice_number}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800 font-semibold">
                    Current Total: {formatCurrency(currentInvoice.invoice.total_amount)}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800 font-semibold">
                    Amount Due: {formatCurrency(currentInvoice.invoice.amount_due)}
                  </span>
                </div>

                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div className="flex flex-wrap gap-4 sm:gap-6 items-end flex-1">
                    {/* Discount Input */}
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

                    {/* Old Item / Battery Exchange Input */}
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

                    {/* Tax Switch */}
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
                          <div className="w-full h-full rounded-full bg-gray-300 dark:bg-slate-600 peer-checked:bg-indigo-600 transition-colors"></div>
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
                    <Button
                      type="button"
                      onClick={handleSaveInvoice}
                      disabled={isSubmitting || Object.keys(errors).length > 0}
                      className="flex items-center justify-center gap-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          Updating Invoice...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Update Invoice
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
          onSubmit={handleSaveInvoice}
          isSubmitting={isSubmitting}
          errors={errors}
          submitError={submitResult?.error?.data?.message || submitResult?.message}
          submitLabel="Update Invoice"
          loadingLabel="Updating Invoice..."
        />
      </div>
    </>
  );
};

export default InvoiceEdit;

