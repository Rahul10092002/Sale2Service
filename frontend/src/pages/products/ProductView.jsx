import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  ArrowLeft,
  Package,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Receipt,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Pencil,
  Settings,
  Edit,
  ImagePlus,
  Maximize2,
  ExternalLink,
  Download,
  ScanLine,
  Check,
  Plus,
  Wrench,
} from "lucide-react";
import { Button, ImageGalleryModal } from "../../components/ui/index.js";
import {
  Dialog as Modal,
  DialogHeader,
  DialogBody,
} from "../../components/ui/Modal.jsx";
import {
  useGetProductByIdQuery,
  useReplaceSerialNumberMutation,
} from "../../features/products/productApi.js";
import EditProductModal from "./EditProductModal.jsx";
import SerialScanner from "../../components/invoice/SerialScanner.jsx";
import {
  useGetInvoiceItemServicesQuery,
  useCreateServicePlanMutation,
  useUpdateServicePlanMutation,
} from "../../features/invoices/invoiceApi.js";
import {
  useMarkServiceCompleteMutation,
  useRescheduleServiceMutation,
  useCancelServiceMutation,
} from "../../features/services/serviceApi.js";
import { showToast } from "../../features/ui/uiSlice.js";
import { ROUTES } from "../../utils/constants.js";
import { LoadingSpinner } from "../../components/ui/index.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { ServiceIntegration } from "../../components/service/index.js";

// Helper: compute service start date based on interval type and value
function computeServiceStartDate(intervalType, intervalValue) {
  const today = new Date();
  let monthsToAdd = 0;

  switch ((intervalType || "MONTHLY").toUpperCase()) {
    case "MONTHLY":
      monthsToAdd = Number(intervalValue) || 1;
      break;
    case "QUARTERLY":
      monthsToAdd = 3 * (Number(intervalValue) || 1);
      break;
    case "SEMI_ANNUALLY":
    case "HALF_YEARLY":
      monthsToAdd = 6 * (Number(intervalValue) || 1);
      break;
    case "ANNUALLY":
    case "YEARLY":
      monthsToAdd = 12 * (Number(intervalValue) || 1);
      break;
    case "CUSTOM":
      monthsToAdd = Number(intervalValue) || 1;
      break;
    default:
      monthsToAdd = Number(intervalValue) || 1;
  }

  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() + monthsToAdd);
  return startDate.toISOString().split("T")[0];
}

// Helper: compute service end date based on start date, interval and count
function computeServiceEndDate(
  startDateStr,
  intervalType,
  intervalValue,
  totalServices,
) {
  if (!startDateStr) return "";
  const start = new Date(startDateStr);
  let monthsDelta = 0;

  switch ((intervalType || "MONTHLY").toUpperCase()) {
    case "MONTHLY":
      monthsDelta = Number(intervalValue) || 1;
      break;
    case "QUARTERLY":
      monthsDelta = 3 * (Number(intervalValue) || 1);
      break;
    case "SEMI_ANNUALLY":
    case "HALF_YEARLY":
      monthsDelta = 6 * (Number(intervalValue) || 1);
      break;
    case "ANNUALLY":
    case "YEARLY":
      monthsDelta = 12 * (Number(intervalValue) || 1);
      break;
    case "CUSTOM":
      monthsDelta = Number(intervalValue) || 1;
      break;
    default:
      monthsDelta = Number(intervalValue) || 1;
  }

  const totalMonths = monthsDelta * Math.max((Number(totalServices) || 1) - 1, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + totalMonths);
  return end.toISOString().split("T")[0];
}

// Helper: get effective warranty end date for a product
function getEffectiveWarrantyEndDate(product) {
  if (product?.pro_warranty_end_date) {
    return product.pro_warranty_end_date;
  }
  if (product?.warranty_end_date) {
    return product.warranty_end_date;
  }
  if (product?.warranty_start_date && product?.warranty_duration_months) {
    const start = new Date(product.warranty_start_date);
    start.setMonth(start.getMonth() + Number(product.warranty_duration_months));
    return start.toISOString().split("T")[0];
  }
  const d = new Date();
  d.setMonth(d.getMonth() + 12);
  return d.toISOString().split("T")[0];
}

// Helper: auto-calculate number of visits based on warranty end date
function computeVisitsFromWarranty(
  serviceStartDate,
  warrantyEndDate,
  intervalType,
  intervalValue,
) {
  let deltaMonths = 1;
  switch ((intervalType || "MONTHLY").toUpperCase()) {
    case "QUARTERLY":
      deltaMonths = 3 * (Number(intervalValue) || 1);
      break;
    case "SEMI_ANNUALLY":
    case "HALF_YEARLY":
      deltaMonths = 6 * (Number(intervalValue) || 1);
      break;
    case "ANNUALLY":
    case "YEARLY":
      deltaMonths = 12 * (Number(intervalValue) || 1);
      break;
    case "CUSTOM":
    default:
      deltaMonths = Number(intervalValue) || 1;
      break;
  }

  if (!serviceStartDate || !warrantyEndDate || deltaMonths <= 0) {
    return 1;
  }

  const start = new Date(serviceStartDate);
  const end = new Date(warrantyEndDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 1;
  }

  const monthsDiff =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    (end.getDate() >= start.getDate() ? 0 : -1);

  if (monthsDiff < 0) return 1;

  const visits = Math.floor(monthsDiff / deltaMonths) + 1;
  return Math.max(1, visits);
}

const ProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { canEdit } = usePermissions();
  const dispatch = useDispatch();
  const serviceSectionRef = useRef(null);

  const routeLabels = {
    "/products": "Products",
    "/dashboard": "Dashboard",
    "/invoices": "Invoices",
    "/customers": "Customers",
  };

  const from = location.state?.from || "/products";
  const label =
    location.state?.label || routeLabels[location.state?.from] || "Products";

  const {
    data: response,
    isLoading,
    error,
    refetch: refetchProduct,
  } = useGetProductByIdQuery(id);

  // Extract product from nested response
  const product = response?.product;

  // Service table state
  const [showRescheduleModal, setShowRescheduleModal] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [amountCollected, setAmountCollected] = useState(0);
  const [rawAmountCollected, setRawAmountCollected] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [technicianName, setTechnicianName] = useState("");
  const [issueReported, setIssueReported] = useState("");
  const [workDone, setWorkDone] = useState("");

  // Service data query
  const {
    data: serviceData,
    isLoading: serviceLoading,
    error: serviceError,
    refetch: refetchService,
  } = useGetInvoiceItemServicesQuery(
    { invoiceId: product?.invoice_id, itemId: id },
    { skip: !product?.invoice_id || !id },
  );

  // Service mutations
  const [markComplete, { isLoading: markingComplete }] =
    useMarkServiceCompleteMutation();
  const [rescheduleServiceMutation, { isLoading: rescheduling }] =
    useRescheduleServiceMutation();
  const [cancelServiceMutation, { isLoading: cancelling }] =
    useCancelServiceMutation();
  const [createServicePlanMutation, { isLoading: creatingPlan }] =
    useCreateServicePlanMutation();
  const [updateServicePlanMutation, { isLoading: updatingPlan }] =
    useUpdateServicePlanMutation();
  const actionLoading = markingComplete || rescheduling || cancelling;

  // New Service Plan state (when item has no service plan yet)
  const [enableServicePlan, setEnableServicePlan] = useState(false);
  const [newIntervalType, setNewIntervalType] = useState("MONTHLY");
  const [newIntervalValue, setNewIntervalValue] = useState(1);
  const [newTotalServices, setNewTotalServices] = useState(1);
  const [newStartDate, setNewStartDate] = useState("");
  const [newCharge, setNewCharge] = useState(0);
  const [newDescription, setNewDescription] = useState("");

  // Initialize new service plan form defaults
  useEffect(() => {
    if (product) {
      const defaultStart = computeServiceStartDate("MONTHLY", 1);
      setNewStartDate(defaultStart);
      const warrantyEnd = getEffectiveWarrantyEndDate(product);
      const visits = computeVisitsFromWarranty(
        defaultStart,
        warrantyEnd,
        "MONTHLY",
        1,
      );
      setNewTotalServices(visits);
      setNewDescription(`Regular service for ${product.product_name || "Product"}`);
    }
  }, [product?.product_name, product?.warranty_end_date, product?.pro_warranty_end_date]);

  const handleToggleEnableService = (enabled) => {
    setEnableServicePlan(enabled);
    if (enabled) {
      const start = computeServiceStartDate(newIntervalType, newIntervalValue);
      setNewStartDate(start);
      const warrantyEnd = getEffectiveWarrantyEndDate(product);
      const visits = computeVisitsFromWarranty(
        start,
        warrantyEnd,
        newIntervalType,
        newIntervalValue,
      );
      setNewTotalServices(visits);
      if (!newDescription && product?.product_name) {
        setNewDescription(`Regular service for ${product.product_name}`);
      }
    }
  };

  const handleCreateServicePlanSubmit = async () => {
    if (!newStartDate) {
      dispatch(
        showToast({
          message: "Service start date is required",
          type: "error",
        }),
      );
      return;
    }
    try {
      await createServicePlanMutation({
        itemId: id,
        service_interval_type: newIntervalType,
        service_interval_value: Number(newIntervalValue) || 1,
        total_services: Number(newTotalServices) || 1,
        service_start_date: newStartDate,
        service_charge: parseFloat(newCharge) || 0,
        service_description:
          newDescription ||
          `Regular service for ${product?.product_name || "Product"}`,
      }).unwrap();

      dispatch(
        showToast({
          message: "Service plan created and schedules generated successfully!",
          type: "success",
        }),
      );
      setEnableServicePlan(false);
      refetchService();
      refetchProduct();
    } catch (err) {
      dispatch(
        showToast({
          message:
            err?.data?.message ||
            err?.message ||
            "Failed to create service plan",
          type: "error",
        }),
      );
    }
  };

  // Image viewer state
  const [selectedImage, setSelectedImage] = useState(null);

  // Edit product modal
  const [showEditProductModal, setShowEditProductModal] = useState(false);

  // Replace serial number state & mutation
  const [showReplaceSerialModal, setShowReplaceSerialModal] = useState(false);
  const [showReplaceScanner, setShowReplaceScanner] = useState(false);
  const [newSerialNumber, setNewSerialNumber] = useState("");
  const [replacementReason, setReplacementReason] = useState("");
  const [replaceSerialNumber, { isLoading: replacingSerial }] =
    useReplaceSerialNumberMutation();

  const handleReplaceSerialNumberSubmit = async () => {
    if (!newSerialNumber.trim()) {
      dispatch(
        showToast({
          message: "New serial number is required",
          type: "error",
        }),
      );
      return;
    }

    try {
      await replaceSerialNumber({
        id,
        new_serial_number: newSerialNumber.trim().toUpperCase(),
        replacement_reason: replacementReason.trim(),
      }).unwrap();

      dispatch(
        showToast({
          message: "Serial number replaced successfully!",
          type: "success",
        }),
      );
      setShowReplaceSerialModal(false);
      setNewSerialNumber("");
      setReplacementReason("");
    } catch (err) {
      dispatch(
        showToast({
          message:
            err?.data?.message ||
            err?.message ||
            "Failed to replace serial number",
          type: "error",
        }),
      );
    }
  };

  // Service plan edit modal state
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [planIntervalType, setPlanIntervalType] = useState("MONTHLY");
  const [planIntervalValue, setPlanIntervalValue] = useState(1);
  const [planTotalServices, setPlanTotalServices] = useState(1);
  const [planStartDate, setPlanStartDate] = useState("");
  const [planCharge, setPlanCharge] = useState(0);
  const [planDescription, setPlanDescription] = useState("");

  const openEditPlanModal = () => {
    const plan = serviceData?.plan;
    if (plan) {
      setPlanIntervalType(plan.service_interval_type || "MONTHLY");
      setPlanIntervalValue(plan.service_interval_value || 1);
      setPlanTotalServices(plan.total_services || 1);
      setPlanStartDate(
        plan.service_start_date
          ? new Date(plan.service_start_date).toISOString().split("T")[0]
          : "",
      );
      setPlanCharge(plan.service_charge || 0);
      setPlanDescription(plan.service_description || "");
    }
    setShowEditPlanModal(true);
  };

  const handleUpdateServicePlan = async () => {
    if (!planStartDate) {
      dispatch(
        showToast({ message: "Service start date is required", type: "error" }),
      );
      return;
    }
    try {
      await updateServicePlanMutation({
        itemId: id,
        service_interval_type: planIntervalType,
        service_interval_value: Number(planIntervalValue),
        total_services: Number(planTotalServices),
        service_start_date: planStartDate,
        service_charge: parseFloat(planCharge) || 0,
        service_description: planDescription,
      }).unwrap();
      dispatch(
        showToast({
          message: "Service plan updated successfully!",
          type: "success",
        }),
      );
      refetchService();
      setShowEditPlanModal(false);
    } catch (err) {
      dispatch(
        showToast({
          message:
            err?.data?.message ||
            err?.message ||
            "Failed to update service plan",
          type: "error",
        }),
      );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };
  const formatBatteryType = (value) => {
    if (!value) return "—";
    return value.replace(/_/g, " ").toLowerCase();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300";
      case "inactive":
        return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300";
      case "warranty":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-slate-800/80 dark:text-slate-200";
    }
  };

  const getServiceStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300";
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-slate-800/80 dark:text-slate-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-slate-800/80 dark:text-slate-300";
    }
  };

  const markServiceComplete = async (scheduleId) => {
    const errors = [];
    if (!issueReported.trim()) errors.push("Issue reported is required");
    if (!workDone.trim()) errors.push("Work done description is required");
    if (!technicianName.trim()) errors.push("Technician name is required");
    if (!completionNotes.trim()) errors.push("Service type is required");
    if (amountCollected < 0) errors.push("Amount collected cannot be negative");
    if (paymentMethod !== "NONE" && amountCollected === 0)
      errors.push(
        "Amount collected is required when payment method is selected",
      );

    if (errors.length > 0) {
      dispatch(
        showToast({
          message:
            "Please fix the following errors:\n\n" +
            errors.map((e) => "• " + e).join("\n"),
          type: "error",
        }),
      );
      return;
    }

    try {
      await markComplete({
        id: scheduleId,
        amount_collected: parseFloat(amountCollected) || 0,
        payment_method: paymentMethod,
        technician_name: technicianName.trim(),
        service_type: completionNotes || "MAINTENANCE",
        issue_reported: issueReported.trim(),
        work_done: workDone.trim(),
      }).unwrap();
      dispatch(
        showToast({
          message: "Service marked as completed successfully!",
          type: "success",
        }),
      );
      refetchService();
      setShowCompleteModal(null);
      setAmountCollected(0);
      setPaymentMethod("CASH");
      setTechnicianName("");
      setCompletionNotes("MAINTENANCE");
      setIssueReported("Regular maintenance service");
      setWorkDone("Service completed successfully");
    } catch (err) {
      dispatch(
        showToast({
          message:
            err?.data?.message ||
            err?.message ||
            "Failed to mark service as complete",
          type: "error",
        }),
      );
    }
  };

  const rescheduleService = async (scheduleId) => {
    try {
      if (!rescheduleDate) {
        dispatch(
          showToast({
            message: "Please select a new date for the service.",
            type: "error",
          }),
        );
        return;
      }
      await rescheduleServiceMutation({
        id: scheduleId,
        new_date: rescheduleDate,
        reschedule_reason: "Rescheduled by user",
      }).unwrap();
      dispatch(
        showToast({
          message: "Service rescheduled successfully!",
          type: "success",
        }),
      );
      refetchService();
      setShowRescheduleModal(null);
      setRescheduleDate("");
    } catch (err) {
      dispatch(
        showToast({
          message:
            err?.data?.message ||
            err?.message ||
            "Failed to reschedule service",
          type: "error",
        }),
      );
    }
  };

  const cancelService = async (scheduleId) => {
    if (
      !confirm(
        "Are you sure you want to cancel this service? This action cannot be undone.",
      )
    )
      return;
    try {
      await cancelServiceMutation({
        id: scheduleId,
        reason: "Cancelled by user",
      }).unwrap();
      dispatch(
        showToast({
          message: "Service cancelled successfully!",
          type: "success",
        }),
      );
      refetchService();
    } catch (err) {
      dispatch(
        showToast({
          message:
            err?.data?.message || err?.message || "Failed to cancel service",
          type: "error",
        }),
      );
    }
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

  if (error || !product) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
                Product not found
              </h3>
              <p className="text-ink-secondary dark:text-slate-400 mb-6">
                The product you're looking for doesn't exist or has been
                deleted.
              </p>
              <Link to={ROUTES.PRODUCTS}>
                <Button>Back to Products</Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="compact min-h-screen bg-gray-50 dark:bg-dark-bg p-2">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-dark-card p-3.5 sm:p-4 rounded-xl shadow-xs border border-gray-200 dark:border-dark-border mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(from)}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <ArrowLeft size={14} className="mr-1.5" />
                Back to {label}
              </button>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Product Details
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {product?.invoice?._id && (
                <Link
                  to={`${ROUTES.INVOICES}/${product.invoice._id}`}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" /> View Invoice
                </Link>
              )}
              {canEdit("products") && (
                <button
                  onClick={() => setShowEditProductModal(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-2xs transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Product
                </button>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {/* Left Column - Product Info */}
            <div className="xl:col-span-2 space-y-3">
              {/* Product Header Card */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-3.5 sm:p-5 text-white shadow-sm border border-purple-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold capitalize leading-tight truncate">
                        {product.product_name || "Unknown Product"}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-purple-100 flex-wrap mt-0.5 font-mono">
                        <span>SN: {product.serial_number || "N/A"}</span>
                        {product?.invoice?.invoice_number && (
                          <span>Inv: #{product.invoice.invoice_number}</span>
                        )}
                      </div>
                      {product?.invoice?.invoice_date && (
                        <p className="text-[11px] text-purple-200 mt-0.5">
                          Issued: {formatDate(product.invoice.invoice_date)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 border-t border-purple-500/40 sm:border-0 w-full sm:w-auto flex-wrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        product.status
                          ? {
                              active:
                                "bg-emerald-100 text-emerald-900",
                              inactive:
                                "bg-red-100 text-red-900",
                              warranty:
                                "bg-blue-100 text-blue-900",
                            }[product.status.toLowerCase()] ||
                            "bg-gray-100 text-gray-900"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {product.status || "Unknown"}
                    </span>
                    {product.is_serial_replaced && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900">
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Replaced
                      </span>
                    )}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-purple-900 shadow-2xs">
                      {formatCurrency(product.selling_price)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Media Gallery */}
              {(product.product_images?.length > 0 ||
                product.serial_number_image ||
                product.warranty_card_image ||
                product.installation_image ||
                product.customer_with_product_image) && (
                <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 flex items-center gap-2">
                        <ImagePlus className="w-5 h-5 text-purple-500" />
                        Product Media
                      </h3>
                      <span className="text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                        {(product.product_images?.length || 0) +
                          (product.serial_number_image ? 1 : 0) +
                          (product.warranty_card_image ? 1 : 0) +
                          (product.installation_image ? 1 : 0) +
                          (product.customer_with_product_image ? 1 : 0)}{" "}
                        Items
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {/* Product Images */}
                      {product.product_images?.map((url, idx) => (
                        <div
                          key={`prod-img-${idx}`}
                          onClick={() =>
                            setSelectedImage({
                              url,
                              title: `Product Image ${idx + 1}`,
                            })
                          }
                          className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-subtle cursor-pointer hover:shadow-md transition-all duration-300"
                        >
                          <img
                            src={url}
                            alt={`Product ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                            <Maximize2
                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              size={20}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Specialized Images */}
                      {[
                        {
                          url: product.serial_number_image,
                          label: "Serial Number",
                        },
                        {
                          url: product.warranty_card_image,
                          label: "Warranty Card",
                        },
                        {
                          url: product.installation_image,
                          label: "Installation",
                        },
                        {
                          url: product.customer_with_product_image,
                          label: "Customer/Product",
                        },
                      ]
                        .filter((item) => item.url)
                        .map((item, idx) => (
                          <div
                            key={`special-img-${idx}`}
                            onClick={() =>
                              setSelectedImage({
                                url: item.url,
                                title: item.label,
                              })
                            }
                            className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-subtle cursor-pointer hover:shadow-md transition-all duration-300"
                          >
                            <img
                              src={item.url}
                              alt={item.label}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors duration-300 flex flex-col items-center justify-center p-2 text-center">
                              <Maximize2
                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 mb-1"
                                size={18}
                              />
                              <span className="text-[10px] text-white font-medium uppercase tracking-wider">
                                {item.label}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Product Information */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-500" />
                    Product Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Product Name
                      </label>
                      <p className="text-xs font-medium text-ink-base dark:text-slate-100 capitalize">
                        {product.product_name || "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Company
                      </label>
                      <p className="text-xs font-medium text-ink-base dark:text-slate-100 capitalize">
                        {product.company || "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Model Number
                      </label>
                      <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                        {product.model_number || "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1 flex items-center justify-between">
                        <span>Serial Number</span>
                        {product.is_serial_replaced && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                            (Replaced)
                          </span>
                        )}
                      </label>
                      <p className="text-xs font-medium text-ink-base dark:text-slate-100 font-mono">
                        {product.serial_number || "—"}
                      </p>
                    </div>
                    {product.previous_serial_number && (
                      <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg p-2">
                        <label className="block text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                          Previous Serial Number
                        </label>
                        <p className="text-xs font-medium text-amber-900 dark:text-amber-200 font-mono">
                          {product.previous_serial_number}
                        </p>
                      </div>
                    )}
                    {product.replacement_date && (
                      <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg p-2">
                        <label className="block text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                          Replacement Date
                        </label>
                        <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                          {formatDate(product.replacement_date)}
                        </p>
                      </div>
                    )}
                    {product.replacement_reason && (
                      <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg p-2 md:col-span-3">
                        <label className="block text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                          Replacement Reason / Notes
                        </label>
                        <p className="text-xs text-amber-950 dark:text-amber-100">
                          {product.replacement_reason}
                        </p>
                      </div>
                    )}
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Category
                      </label>
                      <p className="text-xs font-medium text-ink-base dark:text-slate-100 capitalize">
                        {product.product_category
                          ? product.product_category
                              .replace(/_/g, " ")
                              .toLowerCase()
                          : "—"}
                      </p>
                    </div>
                    {product.product_category === "BATTERY" && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Battery Type
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100 capitalize">
                          {formatBatteryType(product.battery_type)}
                        </p>
                      </div>
                    )}
                    {product.product_category === "BATTERY" &&
                      product.battery_type === "VEHICLE_BATTERY" && (
                        <>
                          <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                              Vehicle Name
                            </label>
                            <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                              {product.vehicle_name || "—"}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                            <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                              Number Plate
                            </label>
                            <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                              {product.vehicle_number_plate || "—"}
                            </p>
                          </div>
                        </>
                      )}
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Quantity
                      </label>
                      <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                        {product.quantity ?? "—"}
                      </p>
                    </div>
                    {product.capacity_rating && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Capacity / Rating
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                          {product.capacity_rating}
                        </p>
                      </div>
                    )}
                    {product.voltage && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Voltage
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                          {product.voltage}
                        </p>
                      </div>
                    )}
                    {product.batch_number && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Batch Number
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100 font-mono">
                          {product.batch_number}
                        </p>
                      </div>
                    )}
                    {product.manufacturing_date && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Manufacturing Date
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                          {formatDate(product.manufacturing_date)}
                        </p>
                      </div>
                    )}
                    {product.purchase_source && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Purchase Source
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100 capitalize">
                          {product.purchase_source}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Warranty & Pricing Information */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-yellow-500" />
                    Warranty &amp; Pricing
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 border border-blue-100 dark:border-blue-900/50">
                      <label className="block text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                        Selling Price
                      </label>
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                        {formatCurrency(product.selling_price)}
                      </p>
                    </div>
                    {product.cost_price != null && (
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2 border border-gray-200 dark:border-dark-border">
                        <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                          Cost Price
                        </label>
                        <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                          {formatCurrency(product.cost_price)}
                        </p>
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 border ${
                        getStatusColor(product.status).includes("green")
                          ? "bg-green-50 dark:bg-green-950/25 border-green-200 dark:border-green-900/50"
                          : getStatusColor(product.status).includes("red")
                            ? "bg-red-50 dark:bg-red-950/25 border-red-200 dark:border-red-900/50"
                            : getStatusColor(product.status).includes("blue")
                              ? "bg-blue-50 dark:bg-blue-950/25 border-blue-200 dark:border-blue-900/50"
                              : "bg-gray-50 dark:bg-dark-subtle border-gray-200 dark:border-dark-border"
                      }`}
                    >
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Status
                      </label>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}
                      >
                        {product.status || "Unknown"}
                      </span>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-950/25 rounded-lg p-2 border border-yellow-100 dark:border-yellow-900/50">
                      <label className="block text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                        Warranty Start Date
                      </label>
                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                        {formatDate(product.warranty_start_date)}
                      </p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-950/25 rounded-lg p-2 border border-yellow-100 dark:border-yellow-900/50">
                      <label className="block text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                        Warranty End Date
                      </label>
                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                        {formatDate(product.warranty_end_date)}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2 border border-gray-200 dark:border-dark-border">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Warranty Duration
                      </label>
                      <p className="text-xs font-medium text-ink-base dark:text-slate-100">
                        {product.warranty_duration_months
                          ? `${product.warranty_duration_months} month${product.warranty_duration_months > 1 ? "s" : ""}`
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg p-2 border border-gray-200 dark:border-dark-border">
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Warranty Type
                      </label>
                      <p className="text-xs font-medium text-ink-base dark:text-slate-100 capitalize">
                        {product.warranty_type
                          ? product.warranty_type
                              .replace(/_/g, " ")
                              .toLowerCase()
                          : "—"}
                      </p>
                    </div>
                    {product.pro_warranty_end_date && (
                      <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-2 border border-purple-100 dark:border-purple-900/50">
                        <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                          Pro Warranty End Date
                        </label>
                        <p className="text-xs font-medium text-purple-800 dark:text-purple-200">
                          {formatDate(product.pro_warranty_end_date)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Details & Configuration Card */}
              {(() => {
                const hasActiveServicePlan = Boolean(
                  product?.hasServicePlan ||
                    serviceData?.hasServicePlan ||
                    serviceData?.plan ||
                    (serviceData?.schedules && serviceData.schedules.length > 0),
                );

                if (hasActiveServicePlan) {
                  return (
                    <div
                      ref={serviceSectionRef}
                      className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border"
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-base font-semibold text-ink-base dark:text-slate-100">
                              Service Details
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Active Plan
                            </span>
                          </div>
                          {canEdit("products") && serviceData?.plan && (
                            <button
                              onClick={openEditPlanModal}
                              disabled={actionLoading || updatingPlan}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 transition-colors disabled:opacity-50"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              Edit Service Plan
                            </button>
                          )}
                        </div>

                        {serviceLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <LoadingSpinner />
                            <span className="ml-2 text-ink-secondary dark:text-slate-400">
                              Loading service data...
                            </span>
                          </div>
                        ) : serviceError ? (
                          <div className="text-center py-8">
                            <AlertCircle
                              className="mx-auto text-red-500 mb-4"
                              size={40}
                            />
                            <p className="text-red-600 dark:text-red-400 text-sm">
                              {serviceError?.data?.message ||
                                serviceError?.message ||
                                "Failed to load service data"}
                            </p>
                            <button
                              onClick={refetchService}
                              className="mt-3 px-4 py-2 text-sm bg-gray-100 dark:bg-dark-subtle hover:bg-gray-200 dark:hover:bg-dark-hover text-ink-base dark:text-slate-100 rounded-lg transition-colors border border-gray-200 dark:border-dark-border"
                            >
                              Try Again
                            </button>
                          </div>
                        ) : !serviceData?.schedules?.length ? (
                          <div className="text-center py-10">
                            <Calendar
                              className="mx-auto text-gray-400 dark:text-slate-500 mb-3"
                              size={40}
                            />
                            <h4 className="text-xs font-medium text-ink-base dark:text-slate-100 mb-1">
                              No Services Found
                            </h4>
                            <p className="text-sm text-ink-muted dark:text-slate-500">
                              No service schedules found for this product.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-dark-border">
                                  <th className="text-left py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400">Date</th>
                                  <th className="text-left py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400">Status</th>
                                  <th className="text-left py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400">Description</th>
                                  <th className="text-left py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400">Charge</th>
                                  <th className="text-left py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400">Collected</th>
                                  <th className="text-right py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {serviceData.schedules.map((schedule) => (
                                  <tr
                                    key={schedule._id}
                                    className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-subtle"
                                  >
                                    <td className="py-2 px-2 text-xs text-ink-base dark:text-slate-200">
                                      {formatDate(schedule.scheduled_date)}
                                    </td>
                                    <td className="py-2 px-2">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getServiceStatusColor(schedule.status)}`}
                                      >
                                        <span className="capitalize">{schedule.status}</span>
                                      </span>
                                    </td>
                                    <td className="py-2 px-2 text-xs text-ink-secondary dark:text-slate-400 max-w-[150px] truncate">
                                      {schedule.service_description || serviceData.plan?.service_description || "—"}
                                    </td>
                                    <td className="py-2 px-2 text-xs font-medium text-ink-base dark:text-slate-200">
                                      {schedule.service_charge
                                        ? `₹${schedule.service_charge.toLocaleString("en-IN")}`
                                        : serviceData.plan?.service_charge
                                          ? `₹${serviceData.plan.service_charge.toLocaleString("en-IN")}`
                                          : "Free"}
                                    </td>
                                    <td className="py-2 px-2">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                          schedule.payment_status === "PAID"
                                            ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                                            : schedule.payment_status === "PARTIAL"
                                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200"
                                              : schedule.payment_status === "FREE"
                                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                                : "bg-gray-100 dark:bg-dark-subtle text-gray-700 dark:text-slate-300"
                                        }`}
                                      >
                                        {schedule.amount_collected ? `₹${schedule.amount_collected.toLocaleString("en-IN")}` : "₹0"}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        {canEdit("products") && (schedule.status === "scheduled" || schedule.status === "overdue") && (
                                          <>
                                            <button
                                              onClick={() => {
                                                const serviceCharge = schedule.service_charge || serviceData.plan?.service_charge || 0;
                                                setAmountCollected(serviceCharge);
                                                setPaymentMethod(serviceCharge === 0 ? "NONE" : "CASH");
                                                setTechnicianName("");
                                                setCompletionNotes("MAINTENANCE");
                                                setIssueReported("Regular maintenance service");
                                                setWorkDone("Service completed successfully");
                                                setShowCompleteModal(schedule._id);
                                              }}
                                              disabled={actionLoading}
                                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 rounded transition-colors disabled:opacity-50"
                                              title="Complete Service"
                                            >
                                              {markingComplete ? <LoadingSpinner size="xs" /> : <CheckCircle2 size={14} />}
                                            </button>
                                            <button
                                              onClick={() => setShowRescheduleModal(schedule._id)}
                                              disabled={actionLoading}
                                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors disabled:opacity-50"
                                              title="Reschedule Service"
                                            >
                                              {rescheduling ? <LoadingSpinner size="xs" /> : <RotateCcw size={14} />}
                                            </button>
                                            {schedule.status === "scheduled" && (
                                              <button
                                                onClick={() => cancelService(schedule._id)}
                                                disabled={actionLoading}
                                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors disabled:opacity-50"
                                                title="Cancel Service"
                                              >
                                                {cancelling ? <LoadingSpinner size="xs" /> : <XCircle size={14} />}
                                              </button>
                                            )}
                                          </>
                                        )}
                                        {(schedule.status === "completed" || schedule.status === "cancelled") && (
                                          <span className="text-[10px] text-ink-muted dark:text-slate-500 italic px-2">
                                            Done
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // If product has NO service plan yet: Render configurable toggle card (reference ProductCard.jsx)
                return (
                  <div
                    ref={serviceSectionRef}
                    className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden"
                  >
                    <div className="p-3.5 sm:p-4 space-y-3.5">
                      {/* Section Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-gray-100 dark:border-dark-border/60">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">
                              Maintenance Service Plan
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400">
                              Schedule and track maintenance cycles for this product
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            enableServicePlan
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                              : "bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-slate-400"
                          }`}
                        >
                          {enableServicePlan ? "Configuring Plan" : "No Plan Active"}
                        </span>
                      </div>

                      {/* Toggle Pill - reference ProductCard */}
                      <div className="flex items-center justify-between bg-gray-50/70 dark:bg-dark-bg/60 p-3 rounded-xl border border-gray-200/70 dark:border-dark-border">
                        <div>
                          <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 block">
                            Enable Maintenance Service Plan
                          </span>
                          <span className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400">
                            Auto-schedules recurring maintenance visits for this product
                          </span>
                        </div>
                        {canEdit("products") ? (
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                            <input
                              type="checkbox"
                              checked={enableServicePlan}
                              onChange={(e) =>
                                handleToggleEnableService(e.target.checked)
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-dark-border peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Not enabled
                          </span>
                        )}
                      </div>

                      {/* When toggle is ON: Configurable Form */}
                      {enableServicePlan ? (
                        <div className="space-y-3.5 pt-1 animate-in fade-in">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                Frequency *
                              </label>
                              <select
                                value={newIntervalType}
                                onChange={(e) => {
                                  const nextType = e.target.value;
                                  setNewIntervalType(nextType);
                                  const nextIntervalVal =
                                    nextType !== "CUSTOM"
                                      ? 1
                                      : newIntervalValue <= 1
                                        ? 2
                                        : newIntervalValue;
                                  if (nextType !== "CUSTOM") {
                                    setNewIntervalValue(1);
                                  } else if (newIntervalValue <= 1) {
                                    setNewIntervalValue(2);
                                  }
                                  const start =
                                    newStartDate ||
                                    computeServiceStartDate(
                                      nextType,
                                      nextIntervalVal,
                                    );
                                  if (!newStartDate) {
                                    setNewStartDate(start);
                                  }
                                  const warrantyEnd =
                                    getEffectiveWarrantyEndDate(product);
                                  const autoVisits = computeVisitsFromWarranty(
                                    start,
                                    warrantyEnd,
                                    nextType,
                                    nextIntervalVal,
                                  );
                                  setNewTotalServices(autoVisits);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                <option value="MONTHLY">Monthly (1 month)</option>
                                <option value="QUARTERLY">
                                  Quarterly (3 months)
                                </option>
                                <option value="HALF_YEARLY">
                                  Half-Yearly (6 months)
                                </option>
                                <option value="YEARLY">
                                  Yearly (12 months)
                                </option>
                                <option value="CUSTOM">Custom interval...</option>
                              </select>
                            </div>

                            {newIntervalType === "CUSTOM" && (
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                  Repeat Every (Months) *
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={newIntervalValue}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setNewIntervalValue(val);
                                    const warrantyEnd =
                                      getEffectiveWarrantyEndDate(product);
                                    const autoVisits = computeVisitsFromWarranty(
                                      newStartDate,
                                      warrantyEnd,
                                      "CUSTOM",
                                      val,
                                    );
                                    setNewTotalServices(autoVisits);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="2"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                First Service Date *
                              </label>
                              <input
                                type="date"
                                value={newStartDate}
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  setNewStartDate(newDate);
                                  if (newDate) {
                                    const warrantyEnd =
                                      getEffectiveWarrantyEndDate(product);
                                    const autoVisits = computeVisitsFromWarranty(
                                      newDate,
                                      warrantyEnd,
                                      newIntervalType,
                                      newIntervalValue,
                                    );
                                    setNewTotalServices(autoVisits);
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                <span>Total Visits *</span>
                                <span className="text-[9px] font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded">
                                  Auto(Warranty)
                                </span>
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={newTotalServices}
                                onChange={(e) =>
                                  setNewTotalServices(
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="1"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                Charge per Visit (₹)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={newCharge}
                                  onChange={(e) =>
                                    setNewCharge(parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            <div className="sm:col-span-2 lg:col-span-4">
                              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                Service Description (Optional)
                              </label>
                              <textarea
                                value={newDescription}
                                onChange={(e) =>
                                  setNewDescription(e.target.value)
                                }
                                placeholder="Describe the maintenance service to be performed... (optional)"
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                              />
                            </div>
                          </div>

                          {/* Dynamic Derived Summary Banner */}
                          {(() => {
                            const end = computeServiceEndDate(
                              newStartDate,
                              newIntervalType,
                              newIntervalValue,
                              newTotalServices,
                            );

                            let cadenceText = "Every 1 month (Monthly)";
                            if (newIntervalType === "QUARTERLY")
                              cadenceText = "Every 3 months (Quarterly)";
                            else if (
                              newIntervalType === "HALF_YEARLY" ||
                              newIntervalType === "SEMI_ANNUALLY"
                            )
                              cadenceText = "Every 6 months (Half-Yearly)";
                            else if (
                              newIntervalType === "YEARLY" ||
                              newIntervalType === "ANNUALLY"
                            )
                              cadenceText = "Every 12 months (Yearly)";
                            else if (newIntervalType === "CUSTOM")
                              cadenceText = `Every ${newIntervalValue} month${newIntervalValue > 1 ? "s" : ""}`;

                            const chargeVal = parseFloat(newCharge) || 0;
                            const totalVal = Number(newTotalServices) || 1;

                            return (
                              <div className="bg-gradient-to-r from-indigo-50/90 to-blue-50/70 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 p-3 rounded-lg text-xs space-y-1">
                                <div className="flex items-center justify-between flex-wrap gap-1.5">
                                  <div className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                                    <span>
                                      {totalVal} {totalVal === 1 ? "visit" : "visits"}
                                      {newStartDate && (
                                        <span className="font-normal text-gray-700 dark:text-slate-300">
                                          :{" "}
                                          {new Date(
                                            newStartDate,
                                          ).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          })}
                                          {totalVal > 1 && end && (
                                            <>
                                              {" "}→{" "}
                                              {new Date(end).toLocaleDateString(
                                                "en-IN",
                                                {
                                                  day: "numeric",
                                                  month: "short",
                                                  year: "numeric",
                                                },
                                              )}
                                            </>
                                          )}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <span className="font-bold text-indigo-700 dark:text-indigo-300">
                                    {chargeVal > 0
                                      ? `₹${chargeVal.toLocaleString("en-IN")} / visit · Total ₹${(totalVal * chargeVal).toLocaleString("en-IN")}`
                                      : "Free of charge"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-indigo-600/80 dark:text-indigo-300/70">
                                  Cadence: {cadenceText}
                                </p>
                              </div>
                            );
                          })()}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-dark-border/60">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEnableServicePlan(false)}
                              disabled={creatingPlan}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleCreateServicePlanSubmit}
                              disabled={creatingPlan || !newStartDate}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              <div className="flex items-center gap-1.5">
                                {creatingPlan ? (
                                  <LoadingSpinner size="xs" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Save & Activate Service Plan</span>
                              </div>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 px-4 bg-gray-50/50 dark:bg-dark-bg/30 rounded-lg border border-dashed border-gray-200 dark:border-dark-border">
                          <Calendar className="mx-auto text-indigo-400 dark:text-indigo-500 mb-2 w-7 h-7 opacity-70" />
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-slate-200">
                            No Active Maintenance Service Plan
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                            This product currently has no recurring service plan.
                            Toggle above to configure intervals, charges, and auto-generate service schedules.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right Column - Actions */}
            <div className="xl:col-span-1">
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border sticky top-4">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
                    Quick Actions
                  </h3>

                  {/* Customer summary */}
                  {product.customer && (
                    <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                      <p className="text-xs font-medium text-indigo-500 dark:text-indigo-400 mb-0.5 flex items-center gap-1">
                        <User className="w-3 h-3" /> Customer
                      </p>
                      <p
                        className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 cursor-pointer hover:underline"
                        onClick={() => {
                          if (product.customer?._id) {
                            navigate(
                              `${ROUTES.CUSTOMERS}/${product.customer._id}`,
                              {
                                state: {
                                  from: location.pathname,
                                  label: "Products",
                                },
                              },
                            );
                          }
                        }}
                      >
                        {product.customer.full_name}
                      </p>
                      <a
                        href={`tel:${product.customer.whatsapp_number}`}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                      >
                        {product.customer.whatsapp_number}
                      </a>
                    </div>
                  )}
                  <div className="space-y-3">
                    {product.invoice_id && (
                      <button
                        onClick={() =>
                          navigate(`${ROUTES.INVOICES}/${product.invoice_id}`, {
                            state: { from: location.pathname, label: "Products" },
                          })
                        }
                        className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-subtle hover:border-gray-300 dark:hover:border-dark-border transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink-secondary dark:text-slate-300 group-hover:text-ink-base dark:group-hover:text-slate-100">
                            View Invoice
                          </p>
                          {product.invoice?.invoice_number && (
                            <p className="text-xs text-ink-muted dark:text-slate-500 font-mono">
                              {product.invoice.invoice_number}
                            </p>
                          )}
                        </div>
                      </button>
                    )}

                    {canEdit("products") && (
                      <>
                        {!product?.hasServicePlan &&
                          !serviceData?.hasServicePlan &&
                          !serviceData?.plan && (
                            <button
                              onClick={() => {
                                setEnableServicePlan(true);
                                serviceSectionRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                });
                              }}
                              className="w-full flex items-center space-x-3 p-3 text-left border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40 transition-all duration-200 group"
                            >
                              <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div>
                                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                                  Enable Service Plan
                                </span>
                                <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70">
                                  Configure maintenance schedule
                                </p>
                              </div>
                            </button>
                          )}

                        <button
                          onClick={() => {
                            setNewSerialNumber("");
                            setReplacementReason("");
                            setShowReplaceSerialModal(true);
                          }}
                          className="w-full flex items-center space-x-3 p-3 text-left border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-all duration-200 group"
                        >
                          <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                            <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                              Replace Serial Number
                            </span>
                            <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
                              Warranty product replacement
                            </p>
                          </div>
                        </button>

                        <button
                          onClick={() => setShowEditProductModal(true)}
                          className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-subtle hover:border-gray-300 dark:hover:border-dark-border transition-all duration-200 group"
                        >
                          <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                            <Edit className="w-5 h-5 text-indigo-600" />
                          </div>
                          <span className="text-sm font-medium text-ink-secondary dark:text-slate-300 group-hover:text-ink-base dark:group-hover:text-slate-100">
                            Edit Details
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Service Modal */}
      {showCompleteModal && (
        <Modal
          open={true}
          onClose={() => setShowCompleteModal(null)}
          maxWidth="xl"
        >
          <DialogHeader
            title={
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="text-green-600" size={20} />
                <span className="text-ink-base dark:text-slate-100">Mark Service Complete</span>
              </div>
            }
            onClose={() => setShowCompleteModal(null)}
          />
          <DialogBody>
            <div className="space-y-6">
              <p className="text-ink-secondary dark:text-slate-400">
                Complete the service and record payment details (if applicable).
              </p>

              {serviceData?.schedules?.find(
                (s) => s._id === showCompleteModal,
              ) && (
                <div className="bg-gray-50 dark:bg-dark-subtle p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Service Details
                  </h4>
                  <p className="text-sm text-ink-secondary dark:text-slate-400">
                    Service Charge:{" "}
                    {(() => {
                      const charge =
                        serviceData.schedules.find(
                          (s) => s._id === showCompleteModal,
                        )?.service_charge ?? serviceData.plan?.service_charge;
                      return charge
                        ? `₹${charge.toLocaleString("en-IN")}`
                        : "Free";
                    })()}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Amount Collected *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-ink-muted dark:text-slate-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={
                        rawAmountCollected !== null
                          ? rawAmountCollected
                          : amountCollected
                      }
                      onChange={(e) => {
                        setRawAmountCollected(e.target.value);
                        const value = parseFloat(e.target.value) || 0;
                        if (value >= 0) setAmountCollected(value);
                      }}
                      onBlur={() => setRawAmountCollected(null)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (e.target.value === "NONE") setAmountCollected(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="NONE">No Payment (Free Service)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Technician Name *
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter technician name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Service Type *
                  </label>
                  <select
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select service type</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="REPAIR">Repair</option>
                    <option value="INSTALLATION">Installation</option>
                    <option value="INSPECTION">Inspection</option>
                    <option value="CALIBRATION">Calibration</option>
                    <option value="WARRANTY_SERVICE">Warranty Service</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Issue Reported *
                  </label>
                  <textarea
                    value={issueReported}
                    onChange={(e) => setIssueReported(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="3"
                    placeholder="Describe the issue reported by customer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Work Done *
                  </label>
                  <textarea
                    value={workDone}
                    onChange={(e) => setWorkDone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="3"
                    placeholder="Describe the work performed"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCompleteModal(null);
                    setAmountCollected(0);
                    setPaymentMethod("CASH");
                    setTechnicianName("");
                    setCompletionNotes("MAINTENANCE");
                    setIssueReported("Regular maintenance service");
                    setWorkDone("Service completed successfully");
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    markServiceComplete(showCompleteModal);
                  }}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <div className="flex items-center space-x-1">
                    {actionLoading ? (
                      <LoadingSpinner size="xs" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    <span className="text-ink-base dark:text-slate-100">Complete Service</span>
                  </div>
                </Button>
              </div>
            </div>
          </DialogBody>
        </Modal>
      )}

      {/* Reschedule Service Modal */}
      {showRescheduleModal && (
        <Modal
          open={true}
          onClose={() => setShowRescheduleModal(null)}
          maxWidth="md"
        >
          <DialogHeader
            title={
              <div className="flex items-center space-x-2">
                <Calendar className="text-blue-600" size={20} />
                <span className="text-ink-base dark:text-slate-100">Reschedule Service</span>
              </div>
            }
            onClose={() => setShowRescheduleModal(null)}
          />
          <DialogBody>
            <div className="space-y-4">
              <p className="text-ink-secondary dark:text-slate-400">
                Select a new date for this service.
              </p>
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                  New Service Date *
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                <Button
                  variant="secondary"
                  onClick={() => setShowRescheduleModal(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    rescheduleService(showRescheduleModal);
                  }}
                  disabled={actionLoading || !rescheduleDate}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <div className="flex items-center space-x-1">
                    {actionLoading ? (
                      <LoadingSpinner size="xs" />
                    ) : (
                      <Calendar size={16} />
                    )}
                    <span className="text-ink-base dark:text-slate-100">Reschedule</span>
                  </div>
                </Button>
              </div>
            </div>
          </DialogBody>
        </Modal>
      )}

      {/* Edit Service Plan Modal */}
      {showEditPlanModal && (
        <Modal
          open={true}
          onClose={() => setShowEditPlanModal(false)}
          maxWidth="lg"
        >
          <DialogHeader
            icon={<Settings className="text-indigo-600" size={20} />}
            onClose={() => setShowEditPlanModal(false)}
          >
            <span className="text-ink-base dark:text-slate-100">Edit Service Plan</span>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-5">
              <p className="text-sm text-ink-muted dark:text-slate-500">
                Update the service plan configuration. Pending schedules will be
                regenerated based on new settings. Completed services are
                preserved.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Frequency *
                  </label>
                  <select
                    value={planIntervalType}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setPlanIntervalType(nextType);
                      const nextIntervalVal =
                        nextType !== "CUSTOM"
                          ? 1
                          : planIntervalValue <= 1
                            ? 2
                            : planIntervalValue;
                      if (nextType !== "CUSTOM") {
                        setPlanIntervalValue(1);
                      } else if (planIntervalValue <= 1) {
                        setPlanIntervalValue(2);
                      }
                      const warrantyEnd = getEffectiveWarrantyEndDate(product);
                      const autoVisits = computeVisitsFromWarranty(
                        planStartDate,
                        warrantyEnd,
                        nextType,
                        nextIntervalVal,
                      );
                      setPlanTotalServices(autoVisits);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="MONTHLY">Monthly (1 month)</option>
                    <option value="QUARTERLY">Quarterly (3 months)</option>
                    <option value="HALF_YEARLY">Half-Yearly (6 months)</option>
                    <option value="YEARLY">Yearly (12 months)</option>
                    <option value="CUSTOM">Custom interval...</option>
                  </select>
                </div>

                {planIntervalType === "CUSTOM" && (
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                      Repeat Every (Months) *
                    </label>
                    <input
                      type="number"
                      value={planIntervalValue}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setPlanIntervalValue(val);
                        const warrantyEnd = getEffectiveWarrantyEndDate(product);
                        const autoVisits = computeVisitsFromWarranty(
                          planStartDate,
                          warrantyEnd,
                          "CUSTOM",
                          val,
                        );
                        setPlanTotalServices(autoVisits);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                      placeholder="2"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    First Service Date *
                  </label>
                  <input
                    type="date"
                    value={planStartDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setPlanStartDate(newDate);
                      if (newDate) {
                        const warrantyEnd = getEffectiveWarrantyEndDate(product);
                        const autoVisits = computeVisitsFromWarranty(
                          newDate,
                          warrantyEnd,
                          planIntervalType,
                          planIntervalValue,
                        );
                        setPlanTotalServices(autoVisits);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span>Total Visits *</span>
                    <span className="text-[10px] font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                      Auto (Warranty)
                    </span>
                  </label>
                  <input
                    type="number"
                    value={planTotalServices}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setPlanTotalServices(val);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="1"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Charge per Visit (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-ink-muted dark:text-slate-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={planCharge}
                      onChange={(e) => setPlanCharge(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                      step="1"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Service Description (Optional)
                  </label>
                  <textarea
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows="2"
                    placeholder="Describe the service to be performed... (optional)"
                  />
                </div>
              </div>

              {/* Dynamic Derived Summary in Edit Modal */}
              {(() => {
                const end = computeServiceEndDate(
                  planStartDate,
                  planIntervalType,
                  planIntervalValue,
                  planTotalServices,
                );

                let cadenceText = "Every 1 month (Monthly)";
                if (planIntervalType === "QUARTERLY")
                  cadenceText = "Every 3 months (Quarterly)";
                else if (
                  planIntervalType === "HALF_YEARLY" ||
                  planIntervalType === "SEMI_ANNUALLY"
                )
                  cadenceText = "Every 6 months (Half-Yearly)";
                else if (
                  planIntervalType === "YEARLY" ||
                  planIntervalType === "ANNUALLY"
                )
                  cadenceText = "Every 12 months (Yearly)";
                else if (planIntervalType === "CUSTOM")
                  cadenceText = `Every ${planIntervalValue} month${planIntervalValue > 1 ? "s" : ""}`;

                const chargeVal = parseFloat(planCharge) || 0;
                const totalVal = Number(planTotalServices) || 1;

                return (
                  <div className="bg-gradient-to-r from-indigo-50/90 to-blue-50/70 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 p-3 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <div className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                        <span>
                          {totalVal} {totalVal === 1 ? "visit" : "visits"}
                          {planStartDate && (
                            <span className="font-normal text-gray-700 dark:text-slate-300">
                              :{" "}
                              {new Date(planStartDate).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                              {totalVal > 1 && end && (
                                <>
                                  {" "}→{" "}
                                  {new Date(end).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </>
                              )}
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">
                        {chargeVal > 0
                          ? `₹${chargeVal.toLocaleString("en-IN")} / visit · Total ₹${(totalVal * chargeVal).toLocaleString("en-IN")}`
                          : "Free of charge"}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-600/80 dark:text-indigo-300/70">
                      Cadence: {cadenceText}
                    </p>
                  </div>
                );
              })()}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                <Button
                  variant="secondary"
                  onClick={() => setShowEditPlanModal(false)}
                  disabled={updatingPlan}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUpdateServicePlan}
                  disabled={updatingPlan || !planStartDate}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <div className="flex items-center space-x-1">
                    {updatingPlan ? (
                      <LoadingSpinner size="xs" />
                    ) : (
                      <Settings size={16} />
                    )}
                    <span className="text-ink-base dark:text-slate-100">Save Changes</span>
                  </div>
                </Button>
              </div>
            </div>
          </DialogBody>
        </Modal>
      )}

      {/* Full Image Preview Modal */}
      <ImageGalleryModal
        isOpen={Boolean(selectedImage)}
        onClose={() => setSelectedImage(null)}
        images={selectedImage?.url ? [selectedImage.url] : []}
        title={selectedImage?.title || product?.product_name || "Product Image"}
        subtitle={product?.serial_number ? `SN: ${product.serial_number}` : null}
      />

      {showEditProductModal && (
        <EditProductModal
          open={showEditProductModal}
          onClose={() => setShowEditProductModal(false)}
          product={product}
          productId={id}
        />
      )}

      {/* Replace Serial Number Modal */}
      {showReplaceSerialModal && (
        <Modal
          open={showReplaceSerialModal}
          onClose={() => setShowReplaceSerialModal(false)}
          maxWidth="md"
        >
          <DialogHeader
            title={
              <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400">
                <RotateCcw size={20} />
                <span>Replace Product Serial Number</span>
              </div>
            }
            onClose={() => setShowReplaceSerialModal(false)}
          />
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Current Serial Number
                </label>
                <input
                  type="text"
                  disabled
                  value={product?.serial_number || "N/A"}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-gray-100 dark:bg-slate-800 font-mono text-gray-600 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                  New Serial Number *
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newSerialNumber}
                    onChange={(e) => setNewSerialNumber(e.target.value.toUpperCase())}
                    placeholder="Enter or scan new product serial number"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-card font-mono text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => setShowReplaceScanner(true)}
                    className="px-3 py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-bold hover:bg-amber-200 dark:hover:bg-amber-900/60 flex items-center gap-1.5 shrink-0 border border-amber-200 dark:border-amber-800"
                    title="Scan serial barcode with camera"
                  >
                    <ScanLine className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Scan
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Replacement Reason / Claim Notes
                </label>
                <textarea
                  rows={3}
                  value={replacementReason}
                  onChange={(e) => setReplacementReason(e.target.value)}
                  placeholder="Reason for replacement (e.g. Battery cell defect under warranty claim)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-card text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-dark-border">
                <Button
                  variant="outline"
                  onClick={() => setShowReplaceSerialModal(false)}
                  disabled={replacingSerial}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReplaceSerialNumberSubmit}
                  disabled={replacingSerial || !newSerialNumber.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {replacingSerial ? <LoadingSpinner size="sm" /> : "Confirm & Replace Serial"}
                </Button>
              </div>
            </div>
          </DialogBody>
        </Modal>
      )}

      {/* Camera Serial Scanner for Replacement */}
      {showReplaceScanner && (
        <SerialScanner
          onScan={(scannedCode) => {
            setNewSerialNumber(scannedCode.toUpperCase());
            setShowReplaceScanner(false);
          }}
          onClose={() => setShowReplaceScanner(false)}
        />
      )}
    </>
  );
};

export default ProductView;
