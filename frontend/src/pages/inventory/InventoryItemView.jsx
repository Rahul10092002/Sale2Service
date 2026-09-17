import React, { useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  ArrowLeft,
  Package,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  FileSpreadsheet,
  ShieldCheck,
  Tag,
  Receipt,
  Activity,
  ChevronRight,
  Eye,
  QrCode,
  Boxes,
  AlertCircle,
  Plus,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { Button, LoadingSpinner, ImageGalleryModal } from "../../components/ui/index.js";
import {
  Dialog as Modal,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "../../components/ui/Modal.jsx";
import {
  useGetInventoryItemByIdQuery,
  useUpdateInventoryStatusMutation,
  useDeleteInventoryItemMutation,
} from "../../features/inventory/inventoryApi.js";
import { useDeleteGuard } from "../../context/DeleteGuardContext.jsx";
import { showToast } from "../../features/ui/uiSlice.js";
import { formatDate } from "../../utils/date.js";
import { ROUTES } from "../../utils/constants.js";
import RetroactiveDealerModal from "./RetroactiveDealerModal.jsx";
import EditReceivingSlipModal from "./EditReceivingSlipModal.jsx";

const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
};

const formatAddress = (addr) => {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (typeof addr === "object") {
    const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "";
  }
  return "";
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case "IN_STOCK":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "SOLD":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "DEFECTIVE_RMA":
    case "DEFECTIVE":
      return "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800";
    case "RETURNED":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "UNDER_SERVICE":
      return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  }
};

const InventoryItemView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [copiedSerial, setCopiedSerial] = useState(false);
  const [showEditOriginModal, setShowEditOriginModal] = useState(false);
  const [showEditSlipModal, setShowEditSlipModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [galleryConfig, setGalleryConfig] = useState({
    isOpen: false,
    images: [],
    title: "Image Gallery",
    subtitle: null,
    initialIndex: 0,
  });

  const openGallery = ({ images, title, subtitle, initialIndex = 0 }) => {
    const list = Array.isArray(images)
      ? images.filter(Boolean)
      : typeof images === "string" && images.trim()
      ? [images.trim()]
      : [];
    if (list.length === 0) return;
    setGalleryConfig({
      isOpen: true,
      images: list,
      title: title || "Image Gallery",
      subtitle: subtitle || null,
      initialIndex,
    });
  };

  const closeGallery = () => {
    setGalleryConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const label = location.state?.label || "Purchases";

  const { data, isLoading, isError, error, refetch } = useGetInventoryItemByIdQuery(id);
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateInventoryStatusMutation();
  const [deleteInventoryItem, { isLoading: isDeletingItem }] = useDeleteInventoryItemMutation();
  const { confirmDelete } = useDeleteGuard();

  const item = data?.item;
  const receivingSlipData = data?.receivingSlip;
  const slip = receivingSlipData?.slip;
  const slipRows = receivingSlipData?.rows || [];

  const handleCopySerial = (serial) => {
    if (!serial) return;
    navigator.clipboard.writeText(serial);
    setCopiedSerial(true);
    setTimeout(() => setCopiedSerial(false), 2000);
    dispatch(showToast({ type: "success", message: "Serial number copied to clipboard!" }));
  };

  const handleOpenStatusModal = () => {
    if (!item) return;
    setNewStatus(item.status);
    setStatusNotes("");
    setShowStatusModal(true);
  };

  const handleSaveStatus = async () => {
    if (!newStatus) return;
    try {
      await updateStatus({
        itemId: item._id,
        status: newStatus,
        notes: statusNotes,
      }).unwrap();

      dispatch(showToast({ type: "success", message: "Unit status updated successfully" }));
      setShowStatusModal(false);
      refetch();
    } catch (err) {
      dispatch(showToast({ type: "error", message: err?.data?.message || "Failed to update status" }));
    }
  };

  const handleDeleteUnit = () => {
    if (!item) return;
    if (item.status === "SOLD") {
      dispatch(
        showToast({
          type: "error",
          message: "Cannot delete an inventory unit that is marked as SOLD or linked to an invoice.",
        })
      );
      return;
    }

    confirmDelete({
      itemName: `${item.product_name}${item.serial_number ? ` (S/N: ${item.serial_number})` : ""}`,
      itemType: "Inventory Unit",
      onConfirm: async () => {
        try {
          await deleteInventoryItem(item._id).unwrap();
          dispatch(
            showToast({
              type: "success",
              message: "Inventory unit deleted successfully",
            })
          );
          navigate(location.state?.from || ROUTES.INVENTORY);
        } catch (err) {
          console.error("Delete inventory unit error:", err);
          dispatch(
            showToast({
              type: "error",
              message: err?.data?.message || "Failed to delete inventory unit",
            })
          );
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 text-center">
        <Package className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
          Inventory Item Not Found
        </h3>
        <p className="text-sm text-ink-secondary dark:text-slate-400 mb-6 max-w-md mx-auto">
          {error?.data?.message || "The requested inventory item could not be retrieved or has been deleted."}
        </p>
        <Button onClick={() => navigate(location.state?.from || ROUTES.INVENTORY)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Inventory
        </Button>
      </div>
    );
  }

  const product = item.product_id || {};
  const dealer = item.dealer_id || slip?.dealer || {};
  const purchaseOrder = item.purchase_order_id || {};
  const invoice = item.invoice_id || {};

  const billImages = [
    item.purchase_bill_image,
    ...(Array.isArray(item.purchase_bill_images) ? item.purchase_bill_images : []),
    slip?.purchase_bill_image,
    ...(Array.isArray(slip?.purchase_bill_images) ? slip.purchase_bill_images : []),
    purchaseOrder?.purchase_bill_image,
    ...(Array.isArray(purchaseOrder?.purchase_bill_images) ? purchaseOrder.purchase_bill_images : []),
  ].filter((img, idx, arr) => Boolean(img) && arr.indexOf(img) === idx);

  const productImages = [
    product.image_url,
    product.thumbnail,
    ...(Array.isArray(product.product_images) ? product.product_images : []),
    ...(Array.isArray(product.images) ? product.images : []),
  ].filter((img, idx, arr) => Boolean(img) && arr.indexOf(img) === idx);

  const hasOrigin = Boolean(item.dealer_id || dealer.name || item.purchase_source);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-3 sm:p-6 transition-colors">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Navigation & Action Header Matching InvoiceView */}
        <div className="bg-white dark:bg-dark-card p-3.5 sm:p-4 rounded-xl shadow-xs border border-gray-200 dark:border-dark-border space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 min-w-0">
            <button
              onClick={() => navigate(location.state?.from || ROUTES.INVENTORY)}
              className="inline-flex items-center shrink-0 self-start px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Back to {label}
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white leading-tight truncate">
                {item.product_name}
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Intake on {formatDate(item.purchase_date || item.createdAt)}</span>
                {dealer?.name && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[200px] font-medium text-gray-700 dark:text-gray-300">
                      {dealer.name}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t border-gray-100 dark:border-gray-800 sm:border-0 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditOriginModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs py-2 sm:py-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Edit Origin</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenStatusModal}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs py-2 sm:py-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Update Status</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteUnit}
              disabled={isDeletingItem}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs py-2 sm:py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeletingItem ? "Deleting..." : "Delete Unit"}</span>
            </Button>
          </div>
        </div>

        {/* Missing Origin Warning Banner Matching InvoiceView */}
        {!hasOrigin && (
          <div className="px-3 py-1.5 sm:py-2 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-lg flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Supplier Alert:</strong> This inventory unit is missing purchase origin.
              </span>
            </div>
            <button
              onClick={() => setShowEditOriginModal(true)}
              className="text-[11px] text-amber-700 dark:text-amber-400 font-bold hover:underline"
            >
              Link Supplier / Dealer Now
            </button>
          </div>
        )}

        {/* Main Content Layout Grid Matching InvoiceView */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column (2 Cols) - Hero Card, Bento Details, Linked Slip */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hero Gradient Header Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 sm:p-5 text-white shadow-sm border border-blue-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h2 className="text-base sm:text-lg font-bold break-words leading-tight">
                      {item.product_name}
                    </h2>

                    {/* Unified Interactive Serial Badge */}
                    <div className="flex items-center flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => item.serial_number && handleCopySerial(item.serial_number)}
                        disabled={!item.serial_number}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all max-w-full text-left ${
                          item.serial_number
                            ? "bg-white/15 hover:bg-white/25 active:scale-98 cursor-pointer border border-white/15 text-white group"
                            : "bg-white/10 text-blue-200 cursor-default"
                        }`}
                        title={item.serial_number ? "Click to copy serial number" : ""}
                      >
                        <span className="text-blue-200 text-[10px] font-sans font-bold tracking-wider shrink-0 uppercase">
                          S/N:
                        </span>
                        <span className="break-all font-semibold leading-relaxed">
                          {item.serial_number || "NO SERIAL"}
                        </span>
                        {item.serial_number && (
                          <span className="shrink-0 flex items-center gap-1 ml-1 pl-1.5 border-l border-white/20 text-[10px] font-sans font-bold text-blue-200 group-hover:text-white transition-colors">
                            {copiedSerial ? (
                              <span className="inline-flex items-center gap-1 text-emerald-300">
                                <Check size={12} className="shrink-0" />
                                <span>Copied</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                <Copy size={12} className="shrink-0" />
                                <span>Copy</span>
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t border-blue-500/40 sm:border-0 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0 ${
                      item.status === "SOLD"
                        ? "bg-blue-100 text-blue-900"
                        : item.status === "DEFECTIVE_RMA" || item.status === "DEFECTIVE"
                        ? "bg-red-100 text-red-900"
                        : item.status === "RETURNED"
                        ? "bg-amber-100 text-amber-900"
                        : item.status === "UNDER_SERVICE"
                        ? "bg-purple-100 text-purple-900"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {item.status ? item.status.replace("_", " ") : "IN STOCK"}
                  </span>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-blue-100 block font-medium">
                      Unit Purchase Cost
                    </span>
                    <strong className="text-base sm:text-xl font-bold">
                      {formatCurrency(item.purchase_price)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Product & Supplier Details Cards Grid Matching InvoiceView */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Product Profile Card */}
              <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Product Profile
                  </h3>
                  <div className="flex items-center gap-2">
                    {productImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          openGallery({
                            images: productImages,
                            title: item.product_name || "Product Master Photos",
                            subtitle: `${product.company || "Product"} · ${productImages.length} Image${productImages.length > 1 ? "s" : ""}`,
                            initialIndex: 0,
                          })
                        }
                        className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Photos ({productImages.length})</span>
                      </button>
                    )}
                    
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex items-start gap-2.5">
                    {productImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          openGallery({
                            images: productImages,
                            title: item.product_name || "Product Photos",
                            subtitle: product.company || product.category || "Product Master",
                            initialIndex: 0,
                          })
                        }
                        className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0 bg-gray-100 dark:bg-gray-800 hover:opacity-80 transition-opacity"
                        title="Click to view product photos"
                      >
                        <img
                          src={productImages[0]}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )}
                    <p className="font-bold text-sm text-gray-900 dark:text-white pt-0.5">
                      {item.product_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">
                        Category
                      </span>
                      <strong className="text-gray-900 dark:text-white font-semibold">
                        {product.product_category || product.category || "General Unit"}
                      </strong>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">
                        Brand / Make
                      </span>
                      <strong className="text-gray-900 dark:text-white font-semibold">
                        {product.company || "Standard"}
                      </strong>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">
                        Model Number
                      </span>
                      <strong className="font-mono text-gray-900 dark:text-white font-semibold">
                        {product.model_number || "N/A"}
                      </strong>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">
                        Warranty Period
                      </span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {product.default_warranty_period_months
                          ? `${product.default_warranty_period_months}M`
                          : "Standard"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supplier / Origin Profile Card */}
              <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Supplier & Purchase Origin
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowEditOriginModal(true)}
                    className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                  >
                    Edit
                  </button>
                </div>

                {dealer.name ? (
                  <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span>{dealer.name}</span>
                      {dealer.deleted_at && (
                        <span className="text-[10px] text-amber-600 font-normal">
                          (Retired)
                        </span>
                      )}
                    </p>

                    {dealer.phone && (
                      <p className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <a href={`tel:${dealer.phone}`} className="hover:underline font-bold">
                          {dealer.phone}
                        </a>
                      </p>
                    )}

                    {dealer.email && (
                      <p className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <a href={`mailto:${dealer.email}`} className="hover:underline">
                          {dealer.email}
                        </a>
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                        <span className="text-[10px] text-gray-400 block uppercase font-medium">
                          Bill / Invoice Ref
                        </span>
                        <strong className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                          {item.purchase_invoice_ref || slip?.dealer_invoice_no || "N/A"}
                        </strong>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                        <span className="text-[10px] text-gray-400 block uppercase font-medium">
                          Purchase Date
                        </span>
                        <strong className="text-gray-900 dark:text-white font-semibold">
                          {item.purchase_date ? formatDate(item.purchase_date) : "N/A"}
                        </strong>
                      </div>
                    </div>

                    {billImages.length > 0 && !slip && (
                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 mt-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={billImages[0]}
                            alt="Purchase Document"
                            onClick={() =>
                              openGallery({
                                images: billImages,
                                title: `Supplier Purchase Bill - ${item.purchase_invoice_ref || dealer.name || "Document"}`,
                                subtitle: dealer.name ? `Supplier: ${dealer.name}` : "Purchase Document",
                                initialIndex: 0,
                              })
                            }
                            className="w-8 h-8 rounded object-cover cursor-pointer hover:opacity-80 border border-gray-200 dark:border-gray-700 shrink-0"
                          />
                          <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 truncate">
                            Attached Bill Photo{billImages.length > 1 ? `s (${billImages.length})` : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            openGallery({
                              images: billImages,
                              title: `Supplier Purchase Bill - ${item.purchase_invoice_ref || dealer.name || "Document"}`,
                              subtitle: dealer.name ? `Supplier: ${dealer.name}` : "Purchase Document",
                              initialIndex: 0,
                            })
                          }
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                        >
                          View{billImages.length > 1 ? ` (${billImages.length})` : ""}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 text-center space-y-1">
                    <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold">
                      No Supplier Linked
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      Link a dealer to enable supplier warranty RMA tracking.
                    </p>
                    <Button
                      size="xs"
                      onClick={() => setShowEditOriginModal(true)}
                      className="mt-1"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Link Supplier
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Linked Receiving Slip & Multi-Unit Batch Table Matching InvoiceLineItems */}
            {slip && (
              <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-xs overflow-hidden">
                <div className="p-3.5 sm:p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Linked Receiving Slip #{slip.dealer_invoice_no}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {slip.total_items_count} Units Batch
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEditSlipModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Slip</span>
                    </button>
                  </div>
                </div>

                {/* Slip Meta Info Strip */}
                <div className="p-3.5 bg-indigo-50/20 dark:bg-indigo-950/10 border-b border-gray-100 dark:border-dark-border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-medium">
                      Intake Date & Time
                    </span>
                    <strong className="text-gray-900 dark:text-white">
                      {formatDate(slip.purchase_date)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-medium">
                      Logged By Staff
                    </span>
                    <strong className="text-gray-900 dark:text-white">
                      {slip.created_by
                        ? `${slip.created_by.first_name} ${slip.created_by.last_name || ""}`
                        : "Shop Admin"}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-medium">
                      Batch Total Cost
                    </span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatCurrency(slip.total_cost)}
                    </strong>
                  </div>
                </div>

                {/* Physical Purchase Bill Thumbnail Preview */}
                {billImages.length > 0 && (
                  <div className="p-3 bg-gray-50 dark:bg-dark-bg/60 border-b border-gray-200 dark:border-dark-border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        onClick={() =>
                          openGallery({
                            images: billImages,
                            title: `Receiving Slip Bill #${slip.dealer_invoice_no || ""}`,
                            subtitle: dealer.name ? `Supplier: ${dealer.name}` : `Slip #${slip.dealer_invoice_no}`,
                            initialIndex: 0,
                          })
                        }
                        className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 shrink-0 cursor-pointer hover:opacity-90 transition-opacity bg-black flex items-center justify-center"
                        title="Click to zoom purchase bill"
                      >
                        <img
                          src={billImages[0]}
                          alt="Purchase Bill"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          Supplier Purchase Bill Document
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          Slip #{slip.dealer_invoice_no} attached invoice photo{billImages.length > 1 ? `s (${billImages.length})` : ""}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openGallery({
                          images: billImages,
                          title: `Receiving Slip Bill #${slip.dealer_invoice_no || ""}`,
                          subtitle: dealer.name ? `Supplier: ${dealer.name}` : `Slip #${slip.dealer_invoice_no}`,
                          initialIndex: 0,
                        })
                      }
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-800 shrink-0 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View{billImages.length > 1 ? ` (${billImages.length})` : ""}
                    </button>
                  </div>
                )}

                {/* Sibling Products & Serials Breakdown */}
                <div className="p-3.5 space-y-3">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    All Batch Items in this Receiving Slip:
                  </h4>

                  <div className="divide-y divide-gray-100 dark:divide-dark-border border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden">
                    {slipRows.map((row, rIdx) => (
                      <div key={row.product_id || rIdx} className="p-3 bg-white dark:bg-dark-card space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {rIdx + 1}
                            </span>
                            <strong className="text-gray-900 dark:text-white">
                              {row.product_name}
                            </strong>
                            <span className="text-gray-400 text-[11px]">
                              ({row.company || "Standard"})
                            </span>
                          </div>
                          <div className="text-right text-xs">
                            <span className="text-gray-500 text-[11px]">
                              {formatCurrency(row.purchase_price)} × {row.quantity} ={" "}
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(row.subtotal)}
                            </span>
                          </div>
                        </div>

                        {/* Serials Chips */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {row.units.map((unit) => {
                            const isCurrent = unit.isCurrentItem || unit._id === item._id;

                            return isCurrent ? (
                              <div
                                key={unit._id}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-600 text-white shadow-2xs max-w-full break-all"
                                title="Currently viewed unit"
                              >
                                <QrCode className="w-3 h-3 shrink-0" />
                                <span className="break-all">{unit.serial_number || "NO SERIAL"}</span>
                                <span className="text-[9px] uppercase px-1 bg-white/20 rounded shrink-0">
                                  Current
                                </span>
                              </div>
                            ) : (
                              <Link
                                key={unit._id}
                                to={`${ROUTES.INVENTORY}/${unit._id}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:text-blue-600 hover:border-blue-400 transition-colors max-w-full break-all"
                                title="View this unit"
                              >
                                <QrCode className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="break-all">{unit.serial_number || "NO SERIAL"}</span>
                                <span
                                  className={`text-[8.5px] uppercase px-1 rounded font-semibold shrink-0 ${getStatusBadgeClass(
                                    unit.status
                                  )}`}
                                >
                                  {unit.status ? unit.status.replace("_", " ") : "IN STOCK"}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slip Summary Totals Matching InvoiceLineItems */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                  <div className="w-full sm:max-w-xs ml-auto space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-sm text-gray-900 dark:text-white">
                      <span>Batch Total</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(slip.total_cost)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (1 Col) - Quick Actions Panel, Sales Dispatch, Audit Timeline */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick Actions Card Matching InvoiceView */}
            <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs sticky top-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-dark-border pb-2">
                Inventory Unit Actions
              </h3>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleOpenStatusModal}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" /> Update Unit Status
                  </span>
                  <span className="text-[10px] uppercase font-bold text-purple-600">
                    {item.status || "IN_STOCK"}
                  </span>
                </button>

                {slip && (
                  <button
                    type="button"
                    onClick={() => setShowEditSlipModal(true)}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100/70 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Edit Receiving Slip
                    </span>
                    <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowEditOriginModal(true)}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-600" /> Edit Unit Origin
                  </span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-gray-400" />
                </button>

                {item.status === "IN_STOCK" ? (
                  <Link to={ROUTES.NEW_INVOICE} className="block">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Receipt className="w-4 h-4" /> Create Sales Invoice
                      </span>
                      <span>Available</span>
                    </button>
                  </Link>
                ) : invoice._id ? (
                  <Link to={`${ROUTES.INVOICES}/${invoice._id}`} className="block">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-blue-600" /> View Sales Invoice #{invoice.invoice_number}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                ) : null}

                {product._id && (
                  <Link to={`${ROUTES.PRODUCTS}/${product._id}`} className="block">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-indigo-600" /> View Product Master
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </Link>
                )}

                <div className="pt-2 border-t border-gray-100 dark:border-dark-border">
                  <button
                    type="button"
                    onClick={handleDeleteUnit}
                    disabled={isDeletingItem}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800/80 rounded-lg hover:bg-red-100/80 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" /> Delete Inventory Unit
                    </span>
                    <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400">
                      {isDeletingItem ? "Deleting..." : "Delete"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IMAGE GALLERY MODAL */}
      <ImageGalleryModal
        isOpen={galleryConfig.isOpen}
        onClose={closeGallery}
        images={galleryConfig.images}
        title={galleryConfig.title}
        subtitle={galleryConfig.subtitle}
        initialIndex={galleryConfig.initialIndex}
      />

      {/* STATUS UPDATE MODAL */}
      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} maxWidth="sm">
        <DialogHeader onClose={() => setShowStatusModal(false)}>
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Update Inventory Status</span>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                Select Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-bg text-gray-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-purple-500"
              >
                <option value="IN_STOCK">In Stock (Available)</option>
                <option value="SOLD">Sold (Linked to Invoice)</option>
                <option value="DEFECTIVE_RMA">Defective RMA (Return to Supplier)</option>
                <option value="RETURNED">Returned (Customer Return)</option>
                <option value="UNDER_SERVICE">Under Service / Testing</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                Status Change Note (Optional)
              </label>
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="e.g. Sent for warranty replacement with supplier..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-bg text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowStatusModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveStatus} loading={isUpdatingStatus} disabled={isUpdatingStatus}>
            Save Status
          </Button>
        </DialogFooter>
      </Modal>

      {/* RETROACTIVE DEALER MODAL */}
      <RetroactiveDealerModal
        isOpen={showEditOriginModal}
        onClose={() => {
          setShowEditOriginModal(false);
          refetch();
        }}
        item={item}
      />

      {/* EDIT RECEIVING SLIP MODAL */}
      {slip && (
        <EditReceivingSlipModal
          isOpen={showEditSlipModal}
          onClose={() => setShowEditSlipModal(false)}
          slip={slip}
          rows={slipRows}
          onSuccess={() => {
            refetch();
            dispatch(showToast({ type: "success", message: "Receiving slip updated successfully" }));
          }}
        />
      )}
    </div>
  );
};

export default InventoryItemView;
