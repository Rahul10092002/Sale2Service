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
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  Button,
  LoadingSpinner,
  ImageGalleryModal,
} from "../../components/ui/index.js";
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
import { RecordPaymentModal } from "../../components/invoice/index.js";
import OriginTraceModal from "../../components/inventory/OriginTraceModal.jsx";
import { ROUTES, INVOICE_CONSTANTS } from "../../utils/constants.js";
import { formatDate } from "../../utils/date.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useDeleteGuard } from "../../context/DeleteGuardContext.jsx";
import RetroactiveDealerModal from "../inventory/RetroactiveDealerModal.jsx";

const InvoiceView = () => {
  const { id } = useParams();
  const [selectedRetroItem, setSelectedRetroItem] = useState(null);
  const [selectedTraceItem, setSelectedTraceItem] = useState(null);
  const [selectedItemImages, setSelectedItemImages] = useState(null); // { item, images: string[], activeIndex: number }

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

  // Helper to extract all valid image URLs from a product or service line item
  const getItemImages = (item) => {
    if (!item) return [];
    const list = [];
    if (Array.isArray(item.product_images)) {
      list.push(...item.product_images.filter(Boolean));
    } else if (
      typeof item.product_images === "string" &&
      item.product_images.trim()
    ) {
      list.push(item.product_images.trim());
    }
    if (Array.isArray(item.images)) {
      list.push(...item.images.filter(Boolean));
    }
    if (item.product_image_url && typeof item.product_image_url === "string") {
      list.push(item.product_image_url);
    }
    if (item.image_url && typeof item.image_url === "string") {
      list.push(item.image_url);
    }
    if (item.serial_number_image) {
      list.push(item.serial_number_image);
    }
    if (item.warranty_card_image) {
      list.push(item.warranty_card_image);
    }
    if (item.installation_image) {
      list.push(item.installation_image);
    }
    if (item.customer_with_product_image) {
      list.push(item.customer_with_product_image);
    }
    if (Array.isArray(item.inventory_item_id?.product_images)) {
      list.push(...item.inventory_item_id.product_images.filter(Boolean));
    }
    return [...new Set(list)];
  };

  // Handle API responses that return { invoice, invoice_items }
  const invoiceObj = invoice?.invoice ? invoice.invoice : invoice || {};
  const productItems = (
    invoice?.invoice_items
      ? invoice.invoice_items
      : invoiceObj?.invoice_items || []
  ).map((i) => ({ ...i, item_type: i.item_type || "PRODUCT" }));

  const serviceItems = (invoiceObj?.services || []).map((s) => ({
    ...s,
    item_type: "SERVICE",
  }));

  const items = [...productItems, ...serviceItems];

  const [deleteInvoice] = useDeleteInvoiceMutation();
  const [sendInvoice] = useSendInvoiceMutation();
  const [sendPaymentReminder] = useSendPaymentReminderMutation();
  const [recordPayment] = useRecordPaymentMutation();
  const [downloadPDF] = useDownloadInvoicePDFMutation();
  const [previewPDF] = usePreviewInvoicePDFMutation();
  const dispatch = useDispatch();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isPreviewingPDF, setIsPreviewingPDF] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (amount, paymentMode) => {
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
        <div className="bg-white dark:bg-dark-card p-3.5 sm:p-4 rounded-xl shadow-xs border border-gray-200 dark:border-dark-border space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
            <button
              onClick={() => navigate(location.state?.from || "/invoices")}
              className="inline-flex items-center self-start px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Back to {label}
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">
                Invoice #{invoiceObj.invoice_number}
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Issued on {formatDate(invoiceObj.invoice_date || Date.now())}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0 border-t border-gray-100 dark:border-gray-800 sm:border-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewPDF}
              disabled={isPreviewingPDF}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs py-2 sm:py-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-purple-600" /> Preview PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs py-2 sm:py-1.5"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" /> Download PDF
            </Button>
          </div>
        </div>

        {/* Missing Origin Warning Banner */}
        {missingOriginItemsCount > 0 && (
          <div className="px-3 py-1.5 sm:py-2 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-lg flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Supplier Alert:</strong> {missingOriginItemsCount} item{missingOriginItemsCount > 1 ? "s" : ""} missing purchase origin.
              </span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
              Link below to enable supplier RMA claims
            </span>
          </div>
        )}

        {/* Main Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Invoice Header & Line Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer & Payment Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-4 sm:p-5 text-white shadow-sm border border-emerald-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2
                      className="text-base sm:text-lg font-bold truncate cursor-pointer hover:underline"
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
                    {invoiceObj.customer_id?.whatsapp_number && (
                      <p className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span className="font-mono">{invoiceObj.customer_id.whatsapp_number}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t border-emerald-500/40 sm:border-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
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
                    <span className="text-[11px] text-emerald-100 block font-medium">Total Amount</span>
                    <strong className="text-base sm:text-xl font-bold">₹{invoiceObj.total_amount || "0"}</strong>
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
                      {formatDate(invoiceObj.due_date)}
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

            {/* Line Items Container with Zero-Scroll Mobile Cards + Responsive Desktop Table */}
            <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-xs overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Invoice Line Items
                </h3>
                <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {items.length} Item{items.length === 1 ? "" : "s"}
                </span>
              </div>

              {items && items.length > 0 ? (
                <div>
                  {/* MOBILE CARD VIEW (< md screens) – ZERO horizontal scroll */}
                  <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((item, index) => {
                      const isService = item.item_type === "SERVICE";
                      const hasDealer = Boolean(item.dealer_id || item.purchase_source);
                      const batteryLine = !isService ? invoiceBatteryLine(item) : "";
                      const lineTotal = Number(item.selling_price || item.price || 0) * (Number(item.quantity) || 1);
                      const itemImages = getItemImages(item);

                      const endDate = item.warranty_end_date ? new Date(item.warranty_end_date) : null;
                      const today = new Date();
                      const diffDays = endDate ? Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) : null;
                      const isExpired = diffDays !== null && diffDays < 0;

                      return (
                        <div key={index} className="p-3.5 space-y-2.5 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                          {/* Top: Product Name & Line Amount */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {!isService && !hasDealer && (
                                  <AlertCircle
                                    className="w-3.5 h-3.5 text-red-500 shrink-0"
                                    title="Missing Purchase Origin"
                                  />
                                )}
                                <span className="font-bold text-sm text-gray-900 dark:text-white leading-tight break-words">
                                  {item.product_name}
                                </span>
                                {isService ? (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    {item.service_category || "SERVICE"}
                                  </span>
                                ) : (
                                  item.product_category && item.product_category !== "OTHER" && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase">
                                      {item.product_category}
                                    </span>
                                  )
                                )}
                                {itemImages.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedItemImages({
                                        item,
                                        images: itemImages,
                                        activeIndex: 0,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[10px] font-bold transition-all shadow-2xs group shrink-0"
                                    title={`View ${itemImages.length} image(s)`}
                                  >
                                    <ImageIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                    <span>{itemImages.length} Photo{itemImages.length > 1 ? "s" : ""}</span>
                                    <Eye className="w-2.5 h-2.5 text-purple-500 group-hover:scale-110 transition-transform" />
                                  </button>
                                )}
                              </div>
                              {batteryLine && (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                  {batteryLine}
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(lineTotal)}
                              </span>
                              {Number(item.quantity || 1) > 1 && (
                                <span className="block text-[10px] text-gray-400">
                                  Qty: {item.quantity}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Middle: Serial Number & Warranty Pills */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-100 dark:border-gray-700/60">
                              <span className="text-[10px] text-gray-400 block font-medium">Serial Number</span>
                              <span className="font-mono font-bold text-xs uppercase text-gray-800 dark:text-gray-200 truncate block">
                                {isService && (!item.serial_number || item.serial_number.startsWith("SRV-"))
                                  ? "N/A"
                                  : item.serial_number || "N/A"}
                              </span>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-100 dark:border-gray-700/60">
                              <span className="text-[10px] text-gray-400 block font-medium">Warranty</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-xs text-gray-900 dark:text-white">
                                  {item.warranty_duration_months || 0}M
                                </span>
                                {diffDays !== null && (
                                  <span className={`text-[10px] font-bold ${isExpired ? "text-red-500" : "text-emerald-600"}`}>
                                    ({isExpired ? `Expired` : `${diffDays}d left`})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bottom: Supplier Origin & Product Link */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-800 text-xs">
                            {!isService && (
                              <div className="min-w-0">
                                {hasDealer ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 truncate max-w-[160px]">
                                      {item.dealer_id?.name || item.purchase_source}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTraceItem(item)}
                                      className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 rounded text-[10px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                                    >
                                      <Building2 className="w-3 h-3" /> Trace
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-red-600 dark:text-red-400 font-bold text-[10px] flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" /> No Origin
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedRetroItem({ ...item, invoice: invoiceObj })}
                                      className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded text-[10px] font-bold hover:bg-red-200 border border-red-300 dark:border-red-800 flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> Add Origin
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              {itemImages.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedItemImages({
                                      item,
                                      images: itemImages,
                                      activeIndex: 0,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" /> Photos ({itemImages.length})
                                </button>
                              )}

                              {!isService && (item.inventory_item_id || item._id) && (
                                <Link
                                  to={`/products/${item._id}`}
                                  state={{ from: location.pathname, label: "Invoice" }}
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> View Product
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP TABLE VIEW (≥ md screens) – fluid responsive table with fully visible columns */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700 dark:text-gray-200">
                      <thead className="bg-gray-100 dark:bg-gray-900/80 uppercase font-semibold text-gray-600 dark:text-gray-400 text-[11px]">
                        <tr>
                          <th className="py-3 px-3 w-[28%]">Product / Service</th>
                          <th className="py-3 px-2.5 w-[16%]">Serial #</th>
                          <th className="py-3 px-2.5 w-[22%]">Purchase Origin</th>
                          <th className="py-3 px-2.5 w-[14%]">Warranty</th>
                          <th className="py-3 px-3 w-[15%] text-right">Amount</th>
                          <th className="py-3 px-2 w-[5%] text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {items.map((item, index) => {
                          const isService = item.item_type === "SERVICE";
                          const hasDealer = Boolean(item.dealer_id || item.purchase_source);
                          const batteryLine = !isService ? invoiceBatteryLine(item) : "";
                          const itemImages = getItemImages(item);

                          const endDate = item.warranty_end_date ? new Date(item.warranty_end_date) : null;
                          const today = new Date();
                          const diffDays = endDate ? Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) : null;
                          const isExpired = diffDays !== null && diffDays < 0;

                          return (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                              {/* Product Name & Alert Icon */}
                              <td className="py-3 px-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {!isService && !hasDealer && (
                                      <AlertCircle
                                        className="w-3.5 h-3.5 text-red-500 shrink-0"
                                        title="Missing Purchase Origin - Supplier Warranty RMA Unlinked"
                                      />
                                    )}
                                    <span className="font-bold text-gray-900 dark:text-white break-words">
                                      {item.product_name}
                                    </span>
                                    {isService && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                                        {item.service_category || "SERVICE"}
                                      </span>
                                    )}
                                    {itemImages.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedItemImages({
                                            item,
                                            images: itemImages,
                                            activeIndex: 0,
                                          })
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[10px] font-bold transition-all shadow-2xs group shrink-0"
                                        title={`View ${itemImages.length} image(s) for ${item.product_name}`}
                                      >
                                        <ImageIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                        <span>{itemImages.length} Photo{itemImages.length > 1 ? "s" : ""}</span>
                                        <Eye className="w-2.5 h-2.5 text-purple-500 group-hover:scale-110 transition-transform" />
                                      </button>
                                    )}
                                  </div>

                                  {batteryLine && (
                                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 break-words">
                                      {batteryLine}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Serial Number */}
                              <td className="py-3 px-2.5 font-mono font-bold uppercase text-gray-800 dark:text-gray-200">
                                <span className="break-all text-xs">
                                  {isService && (!item.serial_number || item.serial_number.startsWith("SRV-"))
                                    ? "N/A"
                                    : item.serial_number || "N/A"}
                                </span>
                              </td>

                              {/* Purchase Supplier Origin */}
                              <td className="py-3 px-2.5">
                                {!isService ? (
                                  hasDealer ? (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 truncate max-w-[110px]" title={item.dealer_id?.name || item.purchase_source}>
                                        {item.dealer_id?.name || item.purchase_source}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedTraceItem(item)}
                                        className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 rounded text-[10px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 flex items-center gap-0.5 shrink-0"
                                        title="Trace Purchase Supplier & Invoice Origin"
                                      >
                                        <Building2 className="w-3 h-3" /> Trace
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-red-600 dark:text-red-400 font-bold text-[10px] flex items-center gap-0.5">
                                        <AlertCircle className="w-3 h-3 shrink-0" /> No Origin
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedRetroItem({ ...item, invoice: invoiceObj })}
                                        className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded text-[10px] font-bold hover:bg-red-200 border border-red-300 dark:border-red-800 flex items-center gap-0.5 shrink-0"
                                      >
                                        <Plus className="w-3 h-3" /> Add
                                      </button>
                                    </div>
                                  )
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>

                              {/* Warranty */}
                              <td className="py-3 px-2.5">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {item.warranty_duration_months || 0} Months
                                  </span>
                                  {diffDays !== null && (
                                    <span className={`text-[10px] font-bold ${isExpired ? "text-red-500" : "text-emerald-600"}`}>
                                      {isExpired ? `Expired` : `${diffDays}d left`}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Amount */}
                              <td className="py-3 px-3 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                {formatCurrency(Number(item.selling_price || item.price || 0) * (Number(item.quantity) || 1))}
                              </td>

                              {/* Direct Product Link & Images */}
                              <td className="py-3 px-2 text-center">
                                <div className="inline-flex items-center justify-center gap-1">
                                  {itemImages.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedItemImages({
                                          item,
                                          images: itemImages,
                                          activeIndex: 0,
                                        })
                                      }
                                      className="inline-flex items-center justify-center p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 rounded transition-colors"
                                      title={`View ${itemImages.length} image(s)`}
                                    >
                                      <ImageIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                  {!isService && (item.inventory_item_id || item._id) ? (
                                    <Link
                                      to={`/products/${item._id}`}
                                      state={{ from: location.pathname, label: "Invoice" }}
                                      className="inline-flex items-center justify-center p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
                                      title="Go to Product Details & Service History"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </Link>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-xs">
                  No line items found for this invoice.
                </p>
              )}

              {/* Invoice Summary Totals */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                <div className="w-full sm:max-w-xs ml-auto space-y-1.5 text-xs">
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
                  {invoiceObj.old_item_exchange_price > 0 && (
                    <div className="flex justify-between text-amber-600 font-medium">
                      <span>Old Item / Exchange</span>
                      <span>-{formatCurrency(invoiceObj.old_item_exchange_price)}</span>
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
        <OriginTraceModal
          isOpen={Boolean(selectedTraceItem)}
          onClose={() => setSelectedTraceItem(null)}
          item={selectedTraceItem}
        />

        {/* Modal 2: Record Payment Modal */}
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          invoice={invoiceObj}
          onRecordPayment={handleRecordPayment}
          isLoading={isRecordingPayment}
        />

        {/* Modal 3: Retroactive Dealer Link Modal */}
        <RetroactiveDealerModal
          isOpen={Boolean(selectedRetroItem)}
          onClose={() => setSelectedRetroItem(null)}
          item={selectedRetroItem}
        />

        {/* Modal 4: Product & Service Images Gallery Modal */}
        <ImageGalleryModal
          isOpen={Boolean(selectedItemImages)}
          onClose={() => setSelectedItemImages(null)}
          images={selectedItemImages?.images || []}
          title={selectedItemImages?.item?.product_name || "Product Images"}
          subtitle={
            selectedItemImages?.item ? (
              <span className="flex items-center gap-1.5">
                <span className="font-medium text-purple-600 dark:text-purple-400">
                  {selectedItemImages.item.item_type === "SERVICE"
                    ? "Service Item"
                    : "Product Item"}
                </span>
                {selectedItemImages.item.serial_number && (
                  <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[11px]">
                    SN: {selectedItemImages.item.serial_number}
                  </span>
                )}
              </span>
            ) : null
          }
          initialIndex={selectedItemImages?.activeIndex || 0}
        />
      </div>
    </div>
  );
};

export default InvoiceView;
