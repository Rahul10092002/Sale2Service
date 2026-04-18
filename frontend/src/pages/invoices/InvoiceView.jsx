import React, { useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Download,
  Trash2,
  Calendar,
  User,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Clock,
  Send,
  Eye,
  BellRing,
  CheckCircle,
} from "lucide-react";
import { Button } from "../../components/ui/index.js";
import {
  useGetInvoiceByIdQuery,
  useDeleteInvoiceMutation,
  useSendInvoiceMutation,
  useSendPaymentReminderMutation,
  useRecordPaymentMutation,
  useDownloadInvoicePDFMutation,
  usePreviewInvoicePDFMutation,
} from "../../features/invoices/invoiceApi.js";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "../../components/ui/Modal.jsx";
import { ROUTES, INVOICE_CONSTANTS } from "../../utils/constants.js";
import { LoadingSpinner } from "../../components/ui/index.js";
import { usePermissions } from "../../hooks/usePermissions.js";

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { canEdit, canDelete } = usePermissions();

  const routeLabels = {
    "/products": "Products",
    "/dashboard": "Dashboard",
    "/invoices": "Invoices",
    "/customers": "Customers",
  };

  const label =
    location.state?.label || routeLabels[location.state?.from] || "Invoices";

  const { data: invoice, isLoading, error } = useGetInvoiceByIdQuery(id);

  // Handle API responses that return { invoice, invoice_items }
  const invoiceObj = invoice?.invoice ? invoice.invoice : invoice || {};
  const items = invoice?.invoice_items
    ? invoice.invoice_items
    : invoiceObj?.invoice_items || [];

  const [deleteInvoice] = useDeleteInvoiceMutation();
  const [sendInvoice] = useSendInvoiceMutation();
  const [sendPaymentReminder] = useSendPaymentReminderMutation();
  const [recordPayment] = useRecordPaymentMutation();
  const [downloadPDF] = useDownloadInvoicePDFMutation();
  const [previewPDF] = usePreviewInvoicePDFMutation();
  const dispatch = useDispatch();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isPreviewingPDF, setIsPreviewingPDF] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const handleEditInvoice = () => {
    navigate(`${ROUTES.INVOICES}/${id}/edit`);
  };

  const openDeleteModal = () => setShowDeleteModal(true);

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteInvoice(id).unwrap();
      dispatch(showToast({ message: "Invoice deleted", type: "success" }));
navigate(location.state?.from || "/invoices")
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      dispatch(
        showToast({
          message:
            err?.data?.message || err.message || "Failed to delete invoice",
          type: "error",
        }),
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleSendInvoice = async () => {
    setIsSending(true);
    try {
      await sendInvoice(id).unwrap();
      dispatch(
        showToast({ message: "Invoice sent via WhatsApp", type: "success" }),
      );
    } catch (err) {
      console.error("Failed to send invoice:", err);
      dispatch(
        showToast({
          message:
            err?.data?.message || err.message || "Failed to send invoice",
          type: "error",
        }),
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendPaymentReminder = async () => {
    setIsSendingReminder(true);
    try {
      await sendPaymentReminder(id).unwrap();
      dispatch(
        showToast({
          message: "Payment reminder sent via WhatsApp",
          type: "success",
        }),
      );
    } catch (err) {
      console.error("Failed to send payment reminder:", err);
      dispatch(
        showToast({
          message:
            err?.data?.message ||
            err.message ||
            "Failed to send payment reminder",
          type: "error",
        }),
      );
    } finally {
      setIsSendingReminder(false);
    }
  };

  const openPaymentModal = () => {
    setPaymentAmount(
      String(invoiceObj.amount_due || invoiceObj.total_amount || ""),
    );
    setPaymentMode(invoiceObj.payment_mode || "CASH");
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      dispatch(
        showToast({ message: "Enter a valid payment amount", type: "error" }),
      );
      return;
    }
    setIsRecordingPayment(true);
    try {
      const result = await recordPayment({
        invoiceId: id,
        amount,
        payment_mode: paymentMode,
      }).unwrap();
      dispatch(
        showToast({
          message: result?.message || "Payment recorded",
          type: "success",
        }),
      );
      setShowPaymentModal(false);
    } catch (err) {
      dispatch(
        showToast({
          message:
            err?.data?.message || err.message || "Failed to record payment",
          type: "error",
        }),
      );
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    try {
      const pdfBlob = await downloadPDF(id).unwrap();

      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice_${invoiceObj.invoice_number || id}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      dispatch(
        showToast({ message: "PDF downloaded successfully", type: "success" }),
      );
    } catch (err) {
      console.error("Failed to download PDF:", err);
      dispatch(
        showToast({
          message:
            err?.data?.message || err.message || "Failed to download PDF",
          type: "error",
        }),
      );
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handlePreviewPDF = async () => {
    setIsPreviewingPDF(true);
    try {
      const pdfBlob = await previewPDF(id).unwrap();

      // Create blob URL and open in new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const newWindow = window.open(pdfUrl, "_blank");

      // Set window title
      if (newWindow) {
        newWindow.document.title = `Invoice ${invoiceObj.invoice_number || id} Preview`;
      }

      // Cleanup URL after window loads
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 60000); // Clean up after 1 minute

      dispatch(
        showToast({ message: "PDF opened for preview", type: "success" }),
      );
    } catch (err) {
      console.error("Failed to preview PDF:", err);
      dispatch(
        showToast({
          message: err?.data?.message || err.message || "Failed to preview PDF",
          type: "error",
        }),
      );
    } finally {
      setIsPreviewingPDF(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const invoiceBatteryLine = (item) => {
    if (
      item.product_category !== INVOICE_CONSTANTS.PRODUCT_CATEGORIES.BATTERY ||
      !item.battery_type
    ) {
      return null;
    }
    if (item.battery_type === INVOICE_CONSTANTS.BATTERY_TYPES.INVERTER_BATTERY) {
      return "Inverter battery";
    }
    if (item.battery_type === INVOICE_CONSTANTS.BATTERY_TYPES.VEHICLE_BATTERY) {
      const bits = [item.vehicle_name, item.vehicle_number_plate].filter(
        Boolean,
      );
      return bits.length
        ? `Vehicle battery · ${bits.join(" · ")}`
        : "Vehicle battery";
    }
    return item.battery_type.replace(/_/g, " ");
  };

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !invoice) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
                Invoice not found
              </h3>
              <p className="text-ink-secondary dark:text-slate-400 mb-6">
                The invoice you're looking for doesn't exist or has been
                deleted.
              </p>
              <div>
                <Button onClick={()=>navigate(location.state?.from || "/invoices")}>Back to Invoices</Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  const getPaymentStatus = () => {
    if (invoiceObj.amount_due === 0) return "PAID";
    if (invoiceObj.amount_paid > 0) return "PARTIAL";
    return "UNPAID";
  };
  return (
    <>
      <div className="compact min-h-screen bg-gray-50 dark:bg-dark-bg p-2">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-3">
            <button
              onClick={() => navigate(location.state?.from || "/invoices")}
              className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors duration-200"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to {label}
            </button>
            <h1 className="text-lg font-bold text-ink-base dark:text-slate-100 mt-1">
              Invoice {invoiceObj.invoice_number}
            </h1>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {/* Left Column - Invoice Info */}
            <div className="xl:col-span-2 space-y-3">
              {/* Invoice Header Card */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-teal-600 px-3 py-2 rounded-xl">
                  <div className="flex items-center space-x-4">
                    {/* Invoice Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                        <FileText size={24} className="text-green-500" />
                      </div>
                    </div>
                    {/* Invoice Info */}
                    <div className="text-white">
                      <h2
                        className="text-base font-bold cursor-pointer hover:underline"
                        onClick={() => {
                          if (invoiceObj.customer_id?._id) {
                            navigate(
                              `${ROUTES.CUSTOMERS}/${invoiceObj.customer_id._id}`,
                              {
                                state: {
                                  from: location.pathname,
                                  label: "Invoices",
                                },
                              },
                            );
                          }
                        }}
                      >
                        {invoiceObj.customer_id?.full_name
                          ? invoiceObj.customer_id.full_name
                              .split(" ")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1),
                              )
                              .join(" ")
                          : "Unknown Customer"}
                      </h2>
                      <p className="text-green-100">
                        Invoice #{invoiceObj.invoice_number || "N/A"}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            getPaymentStatus() === "PAID"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {getPaymentStatus()}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-green-800">
                          ₹{invoiceObj.total_amount || "0"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {invoiceObj.customer_id?.full_name && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Customer Name
                        </label>
                        <p
                          className="text-xs font-medium text-ink-base dark:text-slate-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 underline"
                          onClick={() => {
                            if (invoiceObj.customer_id?._id) {
                              navigate(
                                `${ROUTES.CUSTOMERS}/${invoiceObj.customer_id._id}`,
                                {
                                  state: {
                                    from: location.pathname,
                                    label: "Invoices",
                                  },
                                },
                              );
                            }
                          }}
                        >
                          {invoiceObj.customer_id.full_name
                            .split(" ")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                            )
                            .join(" ")}
                        </p>
                      </div>
                    )}
                    {invoiceObj.customer_id?.email && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Customer Email
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                          {invoiceObj.customer_id.email}
                        </p>
                      </div>
                    )}
                    {invoiceObj.customer_id?.whatsapp_number && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Phone Number
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                          {invoiceObj.customer_id.whatsapp_number}
                        </p>
                      </div>
                    )}
                    {invoiceObj.customer_id?.address && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Address
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                          {invoiceObj.customer_id.address?.line1}
                          {invoiceObj.customer_id.address?.city
                            ? `, ${invoiceObj.customer_id.address.city}`
                            : ""}
                          {invoiceObj.customer_id.address?.state
                            ? `, ${invoiceObj.customer_id.address.state}`
                            : ""}
                          {invoiceObj.customer_id.address?.pincode
                            ? ` - ${invoiceObj.customer_id.address.pincode}`
                            : ""}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
                    Invoice Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {invoiceObj.invoice_number && (
                      <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                        <label className="block text-xs font-medium text-blue-600 mb-1">
                          Invoice Number
                        </label>
                        <p className="text-sm font-medium text-blue-800">
                          {invoiceObj.invoice_number}
                        </p>
                      </div>
                    )}
                    {invoiceObj.invoice_date && (
                      <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                        <label className="block text-xs font-medium text-green-600 mb-1">
                          Invoice Date
                        </label>
                        <p className="text-sm font-medium text-green-800">
                          {new Date(
                            invoiceObj.invoice_date,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {invoiceObj.payment_mode && (
                      <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                        <label className="block text-xs font-medium text-yellow-600 mb-1">
                          Payment Method
                        </label>
                        <p className="text-sm font-medium text-yellow-800">
                          {invoiceObj.payment_mode}
                        </p>
                      </div>
                    )}
                    {invoiceObj.total_amount && (
                      <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                        <label className="block text-xs font-medium text-purple-600 mb-1">
                          Total Amount
                        </label>
                        <p className="text-sm font-medium text-purple-800">
                          ₹{invoiceObj.total_amount}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
                    Payment Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {
                      <div
                        className={`rounded-lg p-3 border ${
                          invoiceObj.payment_status === "PAID"
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <label
                          className={`block text-xs font-medium mb-1 ${
                            invoiceObj.payment_status === "PAID"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          Payment Status
                        </label>
                        <p
                          className={`text-sm font-medium ${
                            getPaymentStatus() === "PAID"
                              ? "text-green-800"
                              : "text-red-800"
                          }`}
                        >
                          {getPaymentStatus()}
                        </p>
                      </div>
                    }
                    {invoiceObj.warranty_months > 0 && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Warranty
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                          {invoiceObj.warranty_months} months
                        </p>
                      </div>
                    )}
                    {invoiceObj.due_date &&
                      new Date(invoiceObj.due_date) < new Date() &&
                      invoiceObj.amount_due > 0 && (
                        <div className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-2 rounded text-sm font-medium border border-red-200 dark:border-red-900/50">
                          ⚠️ Payment Overdue
                        </div>
                      )}
                    {invoiceObj._id && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Due Date
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                          {invoiceObj.due_date
                            ? new Date(invoiceObj.due_date).toLocaleDateString(
                                "en-IN",
                              )
                            : "-"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
                    Invoice Items
                  </h3>

                  {items && items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-dark-border">
                            <th className="text-left py-3 px-4 font-medium text-ink-secondary dark:text-slate-400">
                              Product Name
                            </th>
                            <th className="text-left py-2 px-2 font-medium text-ink-secondary dark:text-slate-400">
                              Serial Number
                            </th>
                            <th className="text-left py-2 px-2 font-medium text-ink-secondary dark:text-slate-400">
                              Warranty
                            </th>
                            <th className="text-right py-2 px-2 font-medium text-ink-secondary dark:text-slate-400">
                              Rate
                            </th>
                            <th className="text-right py-2 px-2 font-medium text-ink-secondary dark:text-slate-400">
                              Tax
                            </th>
                            <th className="text-right py-2 px-2 font-medium text-ink-secondary dark:text-slate-400">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                          {items.map((item, index) => {
                            const batteryLine = invoiceBatteryLine(item);
                            return (
                              <tr key={index}>
                                <td
                                  className="py-2 px-2 text-ink-base dark:text-slate-100 underline cursor-pointer"
                                  onClick={() => {
                                    navigate(`${ROUTES.PRODUCTS}/${item._id}`, {
                                      state: {
                                        from: location.pathname,
                                        label: "Invoices",
                                      },
                                    });
                                  }}
                                >
                                  <span className="block">
                                    {item.product_name}
                                  </span>
                                  {batteryLine && (
                                    <span className="block text-[10px] font-normal text-ink-muted dark:text-slate-500 no-underline mt-[2px] cursor-default">
                                      {batteryLine}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-ink-secondary dark:text-slate-400">
                                  {item.serial_number}
                                </td>
                                <td className="py-2 px-2 text-ink-secondary dark:text-slate-400">
                                  {(() => {
                                    const endDate = new Date(
                                      item.warranty_end_date,
                                    );
                                    const today = new Date();

                                    const diffTime = endDate - today;
                                    const diffDays = Math.ceil(
                                      diffTime / (1000 * 60 * 60 * 24),
                                    );

                                    const isExpired = diffDays < 0;

                                    return (
                                      <div className="flex flex-col">
                                        {/* Duration */}
                                        <span className="text-sm font-medium text-ink-base dark:text-slate-200">
                                          {item.warranty_duration_months} Month
                                        </span>

                                        {/* End Date */}
                                        <span className="text-xs text-ink-muted dark:text-slate-500">
                                          Ends:{" "}
                                          {endDate.toLocaleDateString("en-IN")}
                                        </span>

                                        {/* Status */}
                                        <span
                                          className={`text-xs font-medium ${
                                            isExpired
                                              ? "text-red-500"
                                              : "text-green-600"
                                          }`}
                                        >
                                          {isExpired
                                            ? `Expired ${Math.abs(diffDays)} days ago`
                                            : `${diffDays} days left`}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </td>
                            <td className="py-2 px-2 text-right text-ink-secondary dark:text-slate-400">
                              {(() => {
                                const qty = Number(item.quantity) || 1;
                                const originalUnit = Number(item.selling_price || item.price || 0);
                                const originalLine = originalUnit * qty;
                                const isTaxInclusive = invoiceObj.is_tax_inclusive !== false;
                                const taxRate = 0.18;
                                
                                let taxableLine = isTaxInclusive 
                                  ? originalLine / (1 + taxRate) 
                                  : originalLine;
                                
                                return formatCurrency(taxableLine / qty);
                              })()}
                            </td>
                            <td className="py-2 px-2 text-right text-ink-secondary dark:text-slate-400">
                              {(() => {
                                const qty = Number(item.quantity) || 1;
                                const originalUnit = Number(item.selling_price || item.price || 0);
                                const originalLine = originalUnit * qty;
                                const isTaxInclusive = invoiceObj.is_tax_inclusive !== false;
                                const taxRate = 0.18;
                                
                                let tax = isTaxInclusive 
                                  ? originalLine - (originalLine / (1 + taxRate)) 
                                  : originalLine * taxRate;
                                return formatCurrency(tax);
                              })()}
                            </td>
                            <td className="py-2 px-2 text-right text-ink-base dark:text-slate-100">
                              {(() => {
                                const qty = Number(item.quantity) || 1;
                                const originalUnit = Number(item.selling_price || item.price || 0);
                                const originalLine = originalUnit * qty;
                                const isTaxInclusive = invoiceObj.is_tax_inclusive !== false;
                                const taxRate = 0.18;
                                
                                let total = isTaxInclusive 
                                  ? originalLine 
                                  : originalLine * (1 + taxRate);
                                return formatCurrency(total);
                              })()}
                            </td>
                          </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-ink-secondary dark:text-slate-400 text-center py-8">
                      No items found for this invoice.
                    </p>
                  )}
                </div>

                {/* Invoice Summary */}
                <div className="p-3 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-subtle">
                  <div className="max-w-sm ml-auto space-y-1 text-xs">
                    {/* Subtotal */}
                    <div className="flex justify-between">
                      <span className="text-ink-secondary dark:text-slate-400">
                        Subtotal
                      </span>
                      <span className="text-ink-base dark:text-slate-100">
                        {formatCurrency(invoiceObj.subtotal)}
                      </span>
                    </div>

                    {/* Tax */}
                    <div className="flex justify-between">
                      <span className="text-ink-secondary dark:text-slate-400">
                        Tax (
                        {(
                          (invoiceObj.tax / invoiceObj.subtotal) * 100 || 0
                        ).toFixed(0)}
                        %)
                      </span>
                      <span className="text-ink-base dark:text-slate-100">
                        {formatCurrency(invoiceObj.tax)}
                      </span>
                    </div>

                    {/* Discount */}
                    {invoiceObj.discount > 0 && (
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>Discount</span>
                        <span>-{formatCurrency(invoiceObj.discount)}</span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-dark-border pt-2 text-ink-base dark:text-slate-100">
                      <span>Total</span>
                      <span>{formatCurrency(invoiceObj.total_amount)}</span>
                    </div>

                    {/* Paid */}
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Amount Paid</span>
                      <span>{formatCurrency(invoiceObj.amount_paid)}</span>
                    </div>

                    {/* Due */}
                    <div className="flex justify-between text-red-600 dark:text-red-400 font-semibold">
                      <span>Amount Due</span>
                      <span>{formatCurrency(invoiceObj.amount_due)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="p-3 border-t border-gray-200 dark:border-dark-border">
                    <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
                      Notes
                    </h3>
                    <p className="text-xs text-ink-secondary dark:text-slate-400">
                      {invoice.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="xl:col-span-1">
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border sticky top-4">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    {canEdit("invoices") && (
                      <button
                        onClick={handleEditInvoice}
                        className="w-full flex items-center space-x-2 p-2 text-left border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-subtle hover:border-gray-300 dark:hover:border-dark-border transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-ink-secondary dark:text-slate-300 group-hover:text-ink-base dark:group-hover:text-slate-100">
                          Edit Details
                        </span>
                      </button>
                    )}

                    <button
                      onClick={handleDownloadPDF}
                      disabled={isDownloadingPDF}
                      className="w-full flex items-center space-x-2 p-2 text-left border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-subtle hover:border-gray-300 dark:hover:border-dark-border transition-all duration-200 group disabled:opacity-50"
                    >
                      <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <Download className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-xs font-medium text-ink-secondary dark:text-slate-300 group-hover:text-ink-base dark:group-hover:text-slate-100">
                        {isDownloadingPDF ? "Downloading..." : "Download PDF"}
                      </span>
                    </button>

                    <button
                      onClick={handlePreviewPDF}
                      disabled={isPreviewingPDF}
                      className="w-full flex items-center space-x-2 p-2 text-left border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-subtle hover:border-gray-300 dark:hover:border-dark-border transition-all duration-200 group disabled:opacity-50"
                    >
                      <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <Eye className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-xs font-medium text-ink-secondary dark:text-slate-300 group-hover:text-ink-base dark:group-hover:text-slate-100">
                        {isPreviewingPDF ? "Opening..." : "Preview PDF"}
                      </span>
                    </button>

                    <button
                      onClick={handleSendInvoice}
                      disabled={isSending}
                      className="w-full flex items-center space-x-2 p-2 text-left border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-subtle hover:border-gray-300 dark:hover:border-dark-border transition-all duration-200 group disabled:opacity-50"
                    >
                      <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <Send className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-xs font-medium text-ink-secondary dark:text-slate-300 group-hover:text-ink-base dark:group-hover:text-slate-100">
                        {isSending ? "Sending..." : "Send via WhatsApp"}
                      </span>
                    </button>

                    {["UNPAID", "PARTIAL"].includes(
                      invoiceObj.payment_status,
                    ) && (
                      <button
                        onClick={handleSendPaymentReminder}
                        disabled={isSendingReminder}
                        className="w-full flex items-center space-x-2 p-2 text-left border border-orange-200 dark:border-orange-900/50 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-800 transition-all duration-200 group disabled:opacity-50"
                      >
                        <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <BellRing className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="text-xs font-medium text-ink-secondary dark:text-slate-300 group-hover:text-ink-base dark:group-hover:text-slate-100">
                          {isSendingReminder
                            ? "Sending..."
                            : "Send Payment Reminder"}
                        </span>
                      </button>
                    )}

                    {canEdit("invoices") && ["UNPAID", "PARTIAL"].includes(
                      invoiceObj.payment_status,
                    ) && (
                      <button
                        onClick={openPaymentModal}
                        className="w-full flex items-center space-x-2 p-2 text-left border border-emerald-200 dark:border-emerald-900/50 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all duration-200 group"
                      >
                        <div className="shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-ink-secondary dark:text-slate-300 group-hover:text-ink-base dark:group-hover:text-slate-100 block">
                            Mark As Paid
                          </span>
                          {invoiceObj.amount_due > 0 && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                              Due: ₹{Number(invoiceObj.amount_due).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </button>
                    )}

                    {canDelete("invoices") && (
                      <button
                        onClick={openDeleteModal}
                        className="w-full flex items-center space-x-2 p-2 text-left border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-subtle hover:border-gray-300 dark:hover:border-dark-border transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="text-xs font-medium text-ink-secondary dark:text-slate-300 group-hover:text-ink-base dark:group-hover:text-slate-100">
                          Delete Invoice
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <Dialog
            open={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
          >
            <DialogHeader onClose={() => setShowDeleteModal(false)}>
              Confirm Delete
            </DialogHeader>
            <DialogBody>
              Are you sure you want to delete invoice{" "}
              {invoiceObj.invoice_number}? This action cannot be undone.
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="ml-2"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </Dialog>
        )}

        {/* Record Payment Modal */}
        {showPaymentModal && (
          <Dialog
            open={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
          >
            <DialogHeader onClose={() => setShowPaymentModal(false)}>
              Record Payment
            </DialogHeader>
            <DialogBody>
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2 text-sm border border-gray-200 dark:border-dark-border">
                  <div className="flex justify-between">
                    <span className="text-ink-secondary dark:text-slate-400">
                      Total Amount:
                    </span>
                    <span className="font-medium text-ink-base dark:text-slate-100">
                      ₹{Number(invoiceObj.total_amount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-ink-secondary dark:text-slate-400">
                      Already Paid:
                    </span>
                    <span className="font-medium text-green-700 dark:text-green-400">
                      ₹{Number(invoiceObj.amount_paid || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1 border-t border-gray-200 dark:border-dark-border pt-1">
                    <span className="text-ink-secondary dark:text-slate-300 font-medium">
                      Amount Due:
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      ₹{Number(invoiceObj.amount_due || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Payment Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="1"
                    max={invoiceObj.amount_due || invoiceObj.total_amount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-3 py-2 text-sm bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full border border-gray-300 dark:border-dark-border rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="MIXED">Mixed</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="ml-2"
                onClick={handleRecordPayment}
                disabled={
                  isRecordingPayment ||
                  !paymentAmount ||
                  parseFloat(paymentAmount) <= 0
                }
              >
                {isRecordingPayment ? "Saving..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </Dialog>
        )}
      </div>
    </>
  );
};

export default InvoiceView;
