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
  AlertCircle,
  AlertTriangle,
  Building2,
  ExternalLink,
  ShieldCheck,
  Plus,
  Search,
  Maximize2,
} from "lucide-react";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
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
import { usePermissions } from "../../hooks/usePermissions.js";
import { useDeleteGuard } from "../../context/DeleteGuardContext.jsx";
import RetroactiveDealerModal from "../inventory/RetroactiveDealerModal.jsx";

const InvoiceView = () => {
  const { id } = useParams();
  const [selectedRetroItem, setSelectedRetroItem] = useState(null);
  const [selectedTraceItem, setSelectedTraceItem] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { canEdit, canDelete } = usePermissions();
  const { confirmDelete: confirmDeleteGuard } = useDeleteGuard();

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

  const openDeleteModal = () => {
    confirmDeleteGuard({
      itemName: invoiceObj?.invoice_number || `Invoice #${id}`,
      itemType: "Invoice",
      onConfirm: confirmDelete,
    });
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteInvoice(id).unwrap();
      dispatch(showToast({ message: "Invoice deleted", type: "success" }));
      navigate(location.state?.from || "/invoices");
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
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice_${invoiceObj.invoice_number || id}.pdf`;
      document.body.appendChild(link);
      link.click();
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
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const newWindow = window.open(pdfUrl, "_blank");

      if (newWindow) {
        newWindow.document.title = `Invoice ${invoiceObj.invoice_number || id} Preview`;
      }

      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 60000);

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
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 text-center">
        <FileText className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
          Invoice not found
        </h3>
        <p className="text-sm text-ink-secondary dark:text-slate-400 mb-6">
          The invoice you're looking for doesn't exist or has been deleted.
        </p>
        <Button onClick={() => navigate(location.state?.from || "/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const getPaymentStatus = () => {
    if (invoiceObj.amount_due === 0) return "PAID";
    if (invoiceObj.amount_paid > 0) return "PARTIAL";
    return "UNPAID";
  };

  // Check if any physical item is missing dealer origin
  const missingOriginItemsCount = items.filter(
    (item) => item.item_type !== "SERVICE" && !item.dealer_id && !item.purchase_source,
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-3 sm:p-6 transition-colors">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-dark-card p-4 rounded-xl shadow-xs border border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(location.state?.from || "/invoices")}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <ArrowLeft size={16} className="mr-1.5" />
              Back to {label}
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Invoice #{invoiceObj.invoice_number}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Issued on {new Date(invoiceObj.invoice_date || Date.now()).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewPDF}
              disabled={isPreviewingPDF}
              className="flex items-center gap-1.5 text-xs"
            >
              <Eye className="w-4 h-4 text-purple-600" /> Preview PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              className="flex items-center gap-1.5 text-xs"
            >
              <Download className="w-4 h-4 text-indigo-600" /> Download PDF
            </Button>
          </div>
        </div>

        {/* Missing Origin Warning Banner */}
        {missingOriginItemsCount > 0 && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-center justify-between gap-3 text-amber-800 dark:text-amber-300 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span>
                <strong>Supplier Link Alert:</strong> {missingOriginItemsCount} product item(s) in this invoice do not have a linked purchase dealer origin.
              </span>
            </div>
            <span className="text-[11px] font-semibold underline text-amber-700 dark:text-amber-400">
              Add Purchase Origin below to enable supplier RMA warranty claims
            </span>
          </div>
        )}

        {/* Main Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Invoice Header & Line Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer & Payment Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-4 sm:p-5 text-white shadow-sm border border-emerald-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2
                      className="text-base sm:text-lg font-bold cursor-pointer hover:underline"
                      onClick={() => {
                        if (invoiceObj.customer_id?._id) {
                          navigate(`${ROUTES.CUSTOMERS}/${invoiceObj.customer_id._id}`, {
                            state: { from: location.pathname, label: "Invoices" },
                          });
                        }
                      }}
                    >
                      {invoiceObj.customer_id?.full_name || "Unknown Customer"}
                    </h2>
                    <p className="text-xs text-emerald-100 flex items-center gap-2 mt-0.5">
                      {invoiceObj.customer_id?.whatsapp_number && (
                        <span><Phone className="w-3 h-3 inline mr-0.5" />{invoiceObj.customer_id.whatsapp_number}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      getPaymentStatus() === "PAID"
                        ? "bg-emerald-100 text-emerald-900"
                        : getPaymentStatus() === "PARTIAL"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-red-100 text-red-900"
                    }`}
                  >
                    {getPaymentStatus()}
                  </span>
                  <div className="text-right">
                    <span className="text-xs text-emerald-100 block">Total Amount</span>
                    <strong className="text-base sm:text-lg font-bold">₹{invoiceObj.total_amount || "0"}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer & Invoice Details Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer Info Card */}
              <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs space-y-2">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider text-gray-500">
                  Customer Profile
                </h3>
                <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">
                    {invoiceObj.customer_id?.full_name || "Guest Customer"}
                  </p>
                  {invoiceObj.customer_id?.whatsapp_number && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{invoiceObj.customer_id.whatsapp_number}</span>
                    </p>
                  )}
                  {invoiceObj.customer_id?.email && (
                    <p className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span>{invoiceObj.customer_id.email}</span>
                    </p>
                  )}
                  {invoiceObj.customer_id?.address && (
                    <p className="flex items-center gap-1.5 text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {invoiceObj.customer_id.address?.line1}
                        {invoiceObj.customer_id.address?.city ? `, ${invoiceObj.customer_id.address.city}` : ""}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Invoice Meta Card */}
              <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs space-y-2">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider text-gray-500">
                  Billing Meta
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                    <span className="text-[11px] text-gray-400 block">Payment Method</span>
                    <strong className="text-gray-900 dark:text-white font-semibold">{invoiceObj.payment_mode || "CASH"}</strong>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                    <span className="text-[11px] text-gray-400 block">Due Date</span>
                    <strong className="text-gray-900 dark:text-white font-semibold">
                      {invoiceObj.due_date ? new Date(invoiceObj.due_date).toLocaleDateString("en-IN") : "N/A"}
                    </strong>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                    <span className="text-[11px] text-gray-400 block">Paid Amount</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">₹{invoiceObj.amount_paid || 0}</strong>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                    <span className="text-[11px] text-gray-400 block">Balance Due</span>
                    <strong className="text-red-600 dark:text-red-400 font-bold">₹{invoiceObj.amount_due || 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table with Responsive Wrapper & Red Alerts */}
            <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Invoice Line Items
                </h3>
                <span className="text-xs text-gray-500">
                  {items.length} Item(s)
                </span>
              </div>

              {items && items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700 dark:text-gray-200 min-w-[700px]">
                    <thead className="bg-gray-100 dark:bg-gray-900/80 uppercase font-semibold text-gray-600 dark:text-gray-400">
                      <tr>
                        <th className="p-3">Product / Service</th>
                        <th className="p-3">Serial #</th>
                        <th className="p-3">Purchase Supplier Origin</th>
                        <th className="p-3">Warranty</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-center">Action Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {items.map((item, index) => {
                        const isService = item.item_type === "SERVICE";
                        const hasDealer = Boolean(item.dealer_id || item.purchase_source);
                        const batteryLine = !isService ? invoiceBatteryLine(item) : "";

                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            {/* Product Name & Alert Icon */}
                            <td className="p-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  {/* Red Alert Icon if missing purchase origin for physical product */}
                                  {!isService && !hasDealer && (
                                    <AlertCircle
                                      className="w-4 h-4 text-red-500 shrink-0"
                                      title="Missing Purchase Origin - Supplier Warranty RMA Unlinked"
                                    />
                                  )}
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {item.product_name}
                                  </span>
                                  {isService && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      {item.service_category || "SERVICE"}
                                    </span>
                                  )}
                                </div>

                                {batteryLine && (
                                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                                    {batteryLine}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Serial Number */}
                            <td className="p-3 font-mono font-bold uppercase text-gray-800 dark:text-gray-200">
                              {isService && (!item.serial_number || item.serial_number.startsWith("SRV-"))
                                ? "N/A"
                                : item.serial_number || "N/A"}
                            </td>

                            {/* Purchase Supplier Origin */}
                            <td className="p-3">
                              {!isService ? (
                                hasDealer ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                                      {item.dealer_id?.name || item.purchase_source}
                                    </span>
                                    {/* Direct Trace Origin Option */}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTraceItem(item)}
                                      className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 rounded text-[11px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                                      title="Trace Purchase Supplier & Invoice Origin"
                                    >
                                      <Building2 className="w-3 h-3" /> Trace Origin
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-red-600 dark:text-red-400 font-bold text-[11px] flex items-center gap-1">
                                      <AlertCircle className="w-3.5 h-3.5" /> No Origin Linked
                                    </span>
                                    {/* Add Purchase Origin Button when dealer is missing */}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedRetroItem({ ...item, invoice: invoiceObj })}
                                      className="px-2 py-1 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded text-[11px] font-bold hover:bg-red-200 border border-red-300 dark:border-red-800 flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> Add Purchase Origin
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>

                            {/* Warranty */}
                            <td className="p-3">
                              {(() => {
                                const endDate = new Date(item.warranty_end_date);
                                const today = new Date();
                                const diffTime = endDate - today;
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                const isExpired = diffDays < 0;

                                return (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {item.warranty_duration_months || 0} Months
                                    </span>
                                    <span className={`text-[10px] font-bold ${isExpired ? "text-red-500" : "text-emerald-600"}`}>
                                      {isExpired ? `Expired ${Math.abs(diffDays)}d ago` : `${diffDays} days left`}
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>

                            {/* Amount */}
                            <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                              {formatCurrency(Number(item.selling_price || item.price || 0) * (Number(item.quantity) || 1))}
                            </td>

                            {/* Direct Product Link */}
                            <td className="p-3 text-center">
                              {!isService && (item.inventory_item_id || item._id) ? (
                                <Link
                                  to={`/products/${item.inventory_item_id || item._id}`}
                                  state={{ from: location.pathname, label: "Invoice" }}
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                                  title="Go to Product Details & Service History"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Product
                                </Link>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No line items found for this invoice.
                </p>
              )}

              {/* Invoice Summary Totals */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                <div className="max-w-xs ml-auto space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(invoiceObj.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>GST Tax (18%)</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(invoiceObj.tax)}</span>
                  </div>
                  {invoiceObj.discount > 0 && (
                    <div className="flex justify-between text-red-600 font-medium">
                      <span>Discount</span>
                      <span>-{formatCurrency(invoiceObj.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-gray-300 dark:border-gray-600 pt-2 text-gray-900 dark:text-white">
                    <span>Total Amount</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(invoiceObj.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Amount Paid</span>
                    <span>{formatCurrency(invoiceObj.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 dark:text-red-400 font-bold">
                    <span>Balance Due</span>
                    <span>{formatCurrency(invoiceObj.amount_due)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Actions Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs sticky top-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b pb-2">
                Invoice Management & Quick Actions
              </h3>

              <div className="space-y-2">
                {canEdit("invoices") && (
                  <button
                    onClick={handleEditInvoice}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Edit className="w-4 h-4 text-blue-600" /> Edit Invoice Details
                    </span>
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-gray-400" />
                  </button>
                )}

                <button
                  onClick={handleSendInvoice}
                  disabled={isSending}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-600" /> {isSending ? "Sending..." : "Send via WhatsApp"}
                  </span>
                </button>

                {["UNPAID", "PARTIAL"].includes(invoiceObj.payment_status) && (
                  <>
                    <button
                      onClick={handleSendPaymentReminder}
                      disabled={isSendingReminder}
                      className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2">
                        <BellRing className="w-4 h-4 text-amber-600" /> {isSendingReminder ? "Sending..." : "Send Payment Reminder"}
                      </span>
                    </button>

                    {canEdit("invoices") && (
                      <button
                        onClick={openPaymentModal}
                        className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Record Customer Payment
                        </span>
                        <span>Due: ₹{Number(invoiceObj.amount_due || 0).toFixed(0)}</span>
                      </button>
                    )}
                  </>
                )}

                {canDelete("invoices") && (
                  <button
                    onClick={openDeleteModal}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-600" /> Delete Invoice
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal 1: Origin Trace Details Modal */}
        {selectedTraceItem && (
          <Dialog open={Boolean(selectedTraceItem)} onClose={() => setSelectedTraceItem(null)} maxWidth="md">
            <DialogHeader onClose={() => setSelectedTraceItem(null)}>
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                <Building2 className="w-5 h-5" />
                <span>Supplier Origin Trace & Audit Details</span>
              </div>
            </DialogHeader>
            <DialogBody>
              <div className="space-y-4 text-xs">
                {/* Item Summary Card */}
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                      {selectedTraceItem.product_name}
                    </h4>
                    <p className="font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 font-semibold">
                      Serial #: {selectedTraceItem.serial_number || "N/A"}
                    </p>
                  </div>
                  <Link
                    to={`/products/${selectedTraceItem.inventory_item_id || selectedTraceItem._id}`}
                    className="px-3 py-1.5 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg font-bold border border-gray-300 dark:border-gray-600 flex items-center gap-1 hover:underline text-xs shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Product Details
                  </Link>
                </div>

                {/* Dealer Info */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5">
                  <h5 className="font-bold uppercase text-[10px] tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Linked Supplier / Dealer Profile
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Dealer Name</span>
                      <strong className="text-gray-900 dark:text-white text-sm">
                        {selectedTraceItem.dealer_id?.name || selectedTraceItem.purchase_source || "N/A"}
                      </strong>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Contact Person</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {selectedTraceItem.dealer_id?.contact_person || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Phone Number</span>
                      <span className="text-gray-900 dark:text-white font-mono font-bold">
                        {selectedTraceItem.dealer_id?.phone || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Email</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedTraceItem.dealer_id?.email || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Tax ID / GSTIN</span>
                      <span className="text-gray-900 dark:text-white font-mono">
                        {selectedTraceItem.dealer_id?.tax_id || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Physical Address</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedTraceItem.dealer_id?.address || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Purchase Reference Info */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5">
                  <h5 className="font-bold uppercase text-[10px] tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Supplier Intake Reference
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Dealer Invoice / Bill #</span>
                      <strong className="font-mono text-gray-900 dark:text-white uppercase text-sm">
                        {selectedTraceItem.purchase_invoice_ref || selectedTraceItem.dealer_invoice_no || "N/A"}
                      </strong>
                    </div>

                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Intake Purchase Date</span>
                      <span className="text-gray-900 dark:text-white font-semibold">
                        {selectedTraceItem.purchase_date
                          ? new Date(selectedTraceItem.purchase_date).toLocaleDateString("en-IN")
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Purchase Bill Image Attachment (if available) */}
                {selectedTraceItem.purchase_bill_image && (
                  <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                    <h5 className="font-bold uppercase text-[10px] tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      📄 Purchase Bill Photo / Invoice Document
                    </h5>
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="w-16 h-16 rounded overflow-hidden border border-gray-300 dark:border-gray-600 shrink-0">
                        <img
                          src={selectedTraceItem.purchase_bill_image}
                          alt="Purchase Bill"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white block">
                          Supplier Physical Bill Copy
                        </span>
                        <a
                          href={selectedTraceItem.purchase_bill_image}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View / Download Full Image
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTraceItem(null)}>
                Close Trace
              </Button>
            </DialogFooter>
          </Dialog>
        )}

        {/* Modal 2: Delete Confirmation Modal */}
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

        {/* Modal 3: Record Payment Modal */}
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

        {/* Modal 4: Retroactive Dealer Link Modal */}
        <RetroactiveDealerModal
          isOpen={Boolean(selectedRetroItem)}
          onClose={() => setSelectedRetroItem(null)}
          item={selectedRetroItem}
        />
      </div>
    </div>
  );
};

export default InvoiceView;
