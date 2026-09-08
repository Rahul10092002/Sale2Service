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
    setInvoiceData,
  } = useInvoiceForm();

  const [updateInvoice] = useUpdateInvoiceMutation();
  const [submitResult, setSubmitResult] = useState(null);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

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
            pincode: source.customer_id?.address?.pincode || "",
          },
        },
        invoice: {
          invoice_number: source.invoice_number || "",
          invoice_date: source.invoice_date
            ? new Date(source.invoice_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          payment_mode: source.payment_mode || "CASH",
          payment_status: source.payment_status || "UNPAID",
          is_tax_inclusive: source.is_tax_inclusive !== false,
          subtotal: source.subtotal || 0,
          discount: source.discount || 0,
          old_item_exchange_price: source.old_item_exchange_price || 0,
          tax: source.tax || 0,
          total_amount: source.total_amount || 0,
          amount_paid: source.amount_paid || 0,
          amount_due: source.amount_due || 0,
          due_date: source.due_date
            ? new Date(source.due_date).toISOString().split("T")[0]
            : "",
          warranty_months: source.warranty_months || 0,
          notes: source.notes || "",
        },
        invoice_items:
          items.map((item, index) => ({
            id: Date.now() + Math.random() + index,
            item_type: item.item_type || "PRODUCT",
            service_category: item.service_category || "REPAIR",
            product_name: item.product_name || "",
            serial_number: item.serial_number || "",
            selling_price: item.selling_price ?? item.price ?? 0,
            quantity: item.quantity || 1,
            product_category: item.product_category || (item.item_type === "SERVICE" ? "OTHER" : "BATTERY"),
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
    }
  }, [existingInvoice, isLoadingInvoice, setInvoiceData]);

  // Validation function
  const validateAllSections = useCallback(() => {
    const newErrors = {};

    // Customer validation
    if (!currentInvoice.customer.full_name?.trim()) {
      newErrors["customer.full_name"] = "Full name is required";
    }

    if (!currentInvoice.customer.whatsapp_number?.trim()) {
      newErrors["customer.whatsapp_number"] = "WhatsApp number is required";
    }

    if (!currentInvoice.customer.address.line1?.trim()) {
      newErrors["customer.address.line1"] = "Address is required";
    }

    if (!currentInvoice.customer.address.city?.trim()) {
      newErrors["customer.address.city"] = "City is required";
    }

    if (!currentInvoice.customer.address.state?.trim()) {
      newErrors["customer.address.state"] = "State is required";
    }

    if (!currentInvoice.customer.address.pincode?.trim()) {
      newErrors["customer.address.pincode"] = "Pincode is required";
    }

    // Invoice items validation
    if (currentInvoice.invoice_items.length === 0) {
      newErrors["general"] = "At least one product or service item is required";
    } else {
      currentInvoice.invoice_items.forEach((item) => {
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
        return;
      }

      // Clear any existing errors
      setErrors({});

      // Prepare invoice data for submission
      const invoiceData = {
        customer: {
          full_name: currentInvoice.customer.full_name,
          whatsapp_number: currentInvoice.customer.whatsapp_number,
          address: currentInvoice.customer.address,
        },
        invoice: {
          invoice_number: currentInvoice.invoice.invoice_number,
          invoice_date: currentInvoice.invoice.invoice_date,
          payment_mode: currentInvoice.invoice.payment_mode,
          payment_status: currentInvoice.invoice.payment_status,
          is_tax_inclusive: currentInvoice.invoice.is_tax_inclusive !== false,
          subtotal: Number(currentInvoice.invoice.subtotal || 0),
          discount: parseFloat(currentInvoice.invoice.discount || 0),
          old_item_exchange_price: parseFloat(
            currentInvoice.invoice.old_item_exchange_price || 0,
          ),
          tax: Number(currentInvoice.invoice.tax || 0),
          total_amount: Number(currentInvoice.invoice.total_amount || 0),
          amount_paid: Number(currentInvoice.invoice.amount_paid || 0),
          due_date:
            currentInvoice.invoice.payment_status === "PAID"
              ? null
              : currentInvoice.invoice.due_date,
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
          battery_type: item.battery_type || "",
          vehicle_name: item.vehicle_name || "",
          vehicle_number_plate: item.vehicle_number_plate || "",
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
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
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
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
                Invoice not found
              </h3>
              <p className="text-ink-secondary dark:text-slate-400 mb-6">
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
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-4 pb-36 lg:pb-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl border border-gray-200 dark:border-dark-border shadow-xs">
            <div className="flex items-center gap-3">
              <Link to={`${ROUTES.INVOICES}/${id}`}>
                <Button variant="outline" size="sm" className="p-2 min-h-[40px] rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Edit Invoice{" "}
                  {source.invoice_number ||
                    currentInvoice.invoice.invoice_number}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Update invoice details and customer information
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 text-xs min-h-[42px]"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveInvoice}
                disabled={isSubmitting}
                className="flex items-center gap-2 text-xs min-h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5"
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
                className={`p-4 rounded-xl ${
                  submitResult.success
                    ? "bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                    : "bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                }`}
              >
                <p className="font-semibold text-sm">{submitResult.message}</p>
                {submitResult.error && (
                  <p className="text-xs mt-1 opacity-80">
                    {submitResult.error?.data?.message || "Please try again."}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                updateCustomerData={(updates) =>
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

        {/* Mobile Sticky Bottom Action Bar (< lg screens) */}
        <MobileInvoiceSummaryBar
          invoice={currentInvoice.invoice}
          items={currentInvoice.invoice_items}
          rawDiscount={currentInvoice.invoice.discount}
          setRawDiscount={(val) => {
            const discount = parseFloat(val) || 0;
            updateInvoiceData("invoice", { discount });
          }}
          rawOldItemPrice={currentInvoice.invoice.old_item_exchange_price}
          setRawOldItemPrice={(val) => {
            const old_item_exchange_price = parseFloat(val) || 0;
            updateInvoiceData("invoice", { old_item_exchange_price });
          }}
          updateInvoiceData={(updates) => updateInvoiceData("invoice", updates)}
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
