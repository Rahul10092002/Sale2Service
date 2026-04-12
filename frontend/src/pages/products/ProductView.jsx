import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "../../components/ui/index.js";
import {
  Dialog as Modal,
  DialogHeader,
  DialogBody,
} from "../../components/ui/Modal.jsx";
import { useGetProductByIdQuery } from "../../features/products/productApi.js";
import EditProductModal from "./EditProductModal.jsx";
import {
  useGetInvoiceItemServicesQuery,
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
import { ServiceIntegration } from "../../components/service/index.js";

const ProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const routeLabels = {
    "/products": "Products",
    "/dashboard": "Dashboard",
    "/invoices": "Invoices",
    "/customers": "Customers",
  };

  const from = location.state?.from || "/products";
  const label =
    location.state?.label || routeLabels[location.state?.from] || "Products";

  const { data: response, isLoading, error } = useGetProductByIdQuery(id);

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
  const [updateServicePlanMutation, { isLoading: updatingPlan }] =
    useUpdateServicePlanMutation();
  const actionLoading = markingComplete || rescheduling || cancelling;

  // Edit product modal
  const [showEditProductModal, setShowEditProductModal] = useState(false);

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
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
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

  // Service schedule helpers
  const getServiceStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="text-green-600" size={16} />;
      case "scheduled":
        return <Calendar className="text-blue-600" size={16} />;
      case "overdue":
        return <AlertCircle className="text-red-600" size={16} />;
      case "cancelled":
        return <XCircle className="text-ink-secondary dark:text-slate-400" size={16} />;
      default:
        return <Clock className="text-ink-secondary dark:text-slate-400" size={16} />;
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
          <div className="mb-3">
            <button
              onClick={() => navigate(from)}
              className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors duration-200"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to {label}
            </button>
            <h1 className="text-lg font-bold text-ink-base dark:text-slate-100 mt-1">
              Product Details
            </h1>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {/* Left Column - Product Info */}
            <div className="xl:col-span-2 space-y-3">
              {/* Product Header Card */}
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-2 rounded-xl">
                  <div className="flex items-center space-x-4">
                    {/* Product Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                        <Package size={24} className="text-purple-500" />
                      </div>
                    </div>
                    {/* Product Info */}
                    <div className="text-white">
                      <h2 className="text-base font-bold capitalize">
                        {product.product_name || "Unknown Product"}
                      </h2>
                      <p className="text-purple-100">
                        Serial #{product.serial_number || "N/A"}
                      </p>
                      <p className="text-purple-100">
                        Invoice #{product?.invoice?.invoice_number}
                      </p>
                      <p className="text-purple-100">
                        Invoice Date: {formatDate(product?.invoice?.invoice_date)}
                      </p>

                      <div className="flex items-center space-x-4 mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            product.status
                              ? {
                                  active:
                                    "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
                                  inactive:
                                    "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
                                  warranty:
                                    "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
                                }[product.status.toLowerCase()] ||
                                "bg-gray-100 text-gray-800 dark:bg-slate-800/80 dark:text-slate-200"
                              : "bg-gray-100 text-gray-800 dark:bg-slate-800/80 dark:text-slate-200"
                          }`}
                        >
                          {product.status || "Unknown"}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 text-purple-800 dark:text-purple-200">
                          {formatCurrency(product.selling_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Image */}
              {product.product_images?.[0] && (
                <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
                      Product Image
                    </h3>
                    <img
                      src={product.product_images[0]}
                      alt={product.product_name || "Product"}
                      className="w-full max-w-xs rounded-xl border border-gray-200 dark:border-dark-border object-cover shadow-sm"
                    />
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
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Serial Number
                      </label>
                      <p className="text-xs font-medium text-ink-base dark:text-slate-100 font-mono">
                        {product.serial_number || "—"}
                      </p>
                    </div>
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

              {/* Service Details */}
              {product.hasServicePlan && (
                <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-ink-base dark:text-slate-100 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        Service Details
                      </h3>
                      {serviceData?.plan && (
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
                                    {(schedule.status === "scheduled" || schedule.status === "overdue") && (
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
              )}
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
                    Service Interval Type *
                  </label>
                  <select
                    value={planIntervalType}
                    onChange={(e) => setPlanIntervalType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly (3 months)</option>
                    <option value="HALF_YEARLY">Half-Yearly (6 months)</option>
                    <option value="YEARLY">Yearly (12 months)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Interval Value *
                  </label>
                  <input
                    type="number"
                    value={planIntervalValue}
                    onChange={(e) => setPlanIntervalValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="1"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Total Services *
                  </label>
                  <input
                    type="number"
                    value={planTotalServices}
                    onChange={(e) => setPlanTotalServices(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="1"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Service Start Date *
                  </label>
                  <input
                    type="date"
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Service Charge (₹) *
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
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Service Description
                  </label>
                  <textarea
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows="3"
                    placeholder="Describe the service to be performed..."
                  />
                </div>
              </div>

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
      <EditProductModal
        open={showEditProductModal}
        onClose={() => setShowEditProductModal(false)}
        product={product}
        productId={id}
      />
    </>
  );
};

export default ProductView;
