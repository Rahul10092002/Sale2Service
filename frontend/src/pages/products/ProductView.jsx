import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  const dispatch = useDispatch();

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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "warranty":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
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
        return <XCircle className="text-gray-600" size={16} />;
      default:
        return <Clock className="text-gray-600" size={16} />;
    }
  };

  const getServiceStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
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
        <div className="min-h-screen bg-gray-50 py-6">
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
        <div className="min-h-screen bg-gray-50 py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Product not found
              </h3>
              <p className="text-gray-500 mb-6">
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
      <div className="min-h-screen bg-white p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate(ROUTES.PRODUCTS)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Products
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              Product Details
            </h1>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Product Info */}
            <div className="xl:col-span-2 space-y-6">
              {/* Product Header Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
                  <div className="flex items-center space-x-4">
                    {/* Product Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                        <Package size={32} className="text-purple-500" />
                      </div>
                    </div>
                    {/* Product Info */}
                    <div className="text-white">
                      <h2 className="text-2xl font-bold capitalize">
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
                                  active: "bg-green-100 text-green-800",
                                  inactive: "bg-red-100 text-red-800",
                                  warranty: "bg-blue-100 text-blue-800",
                                }[product.status.toLowerCase()] ||
                                "bg-gray-100 text-gray-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {product.status || "Unknown"}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-purple-800">
                          {formatCurrency(product.selling_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Image */}
              {product.product_images?.[0] && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Product Image
                    </h3>
                    <img
                      src={product.product_images[0]}
                      alt={product.product_name || "Product"}
                      className="w-full max-w-xs rounded-xl border border-gray-200 object-cover shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* Product Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-500" />
                    Product Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Product Name
                      </label>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {product.product_name || "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Company
                      </label>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {product.company || "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Model Number
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {product.model_number || "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Serial Number
                      </label>
                      <p className="text-sm font-medium text-gray-900 font-mono">
                        {product.serial_number || "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Category
                      </label>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {product.product_category
                          ? product.product_category
                              .replace(/_/g, " ")
                              .toLowerCase()
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Quantity
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {product.quantity ?? "—"}
                      </p>
                    </div>
                    {product.capacity_rating && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Capacity / Rating
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {product.capacity_rating}
                        </p>
                      </div>
                    )}
                    {product.voltage && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Voltage
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {product.voltage}
                        </p>
                      </div>
                    )}
                    {product.batch_number && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Batch Number
                        </label>
                        <p className="text-sm font-medium text-gray-900 font-mono">
                          {product.batch_number}
                        </p>
                      </div>
                    )}
                    {product.manufacturing_date && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Manufacturing Date
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(product.manufacturing_date)}
                        </p>
                      </div>
                    )}
                    {product.purchase_source && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Purchase Source
                        </label>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {product.purchase_source}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Warranty & Pricing Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-yellow-500" />
                    Warranty &amp; Pricing
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-medium text-blue-600 mb-1">
                        Selling Price
                      </label>
                      <p className="text-sm font-medium text-blue-800">
                        {formatCurrency(product.selling_price)}
                      </p>
                    </div>
                    {product.cost_price != null && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Cost Price
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(product.cost_price)}
                        </p>
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 border ${
                        getStatusColor(product.status).includes("green")
                          ? "bg-green-50 border-green-200"
                          : getStatusColor(product.status).includes("red")
                            ? "bg-red-50 border-red-200"
                            : getStatusColor(product.status).includes("blue")
                              ? "bg-blue-50 border-blue-200"
                              : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Status
                      </label>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}
                      >
                        {product.status || "Unknown"}
                      </span>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                      <label className="block text-xs font-medium text-yellow-600 mb-1">
                        Warranty Start Date
                      </label>
                      <p className="text-sm font-medium text-yellow-800">
                        {formatDate(product.warranty_start_date)}
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                      <label className="block text-xs font-medium text-yellow-600 mb-1">
                        Warranty End Date
                      </label>
                      <p className="text-sm font-medium text-yellow-800">
                        {formatDate(product.warranty_end_date)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Warranty Duration
                      </label>
                      <p className="text-sm font-medium text-gray-900">
                        {product.warranty_duration_months
                          ? `${product.warranty_duration_months} month${product.warranty_duration_months > 1 ? "s" : ""}`
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Warranty Type
                      </label>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {product.warranty_type
                          ? product.warranty_type
                              .replace(/_/g, " ")
                              .toLowerCase()
                          : "—"}
                      </p>
                    </div>
                    {product.pro_warranty_end_date && (
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                        <label className="block text-xs font-medium text-purple-600 mb-1">
                          Pro Warranty End Date
                        </label>
                        <p className="text-sm font-medium text-purple-800">
                          {formatDate(product.pro_warranty_end_date)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Details */}
              {product.hasServicePlan && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        Service Details
                      </h3>
                      {serviceData?.plan && (
                        <button
                          onClick={openEditPlanModal}
                          disabled={actionLoading || updatingPlan}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Edit Service Plan
                        </button>
                      )}
                    </div>

                    {serviceLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner />
                        <span className="ml-2 text-gray-500">
                          Loading service data...
                        </span>
                      </div>
                    ) : serviceError ? (
                      <div className="text-center py-8">
                        <AlertCircle
                          className="mx-auto text-red-500 mb-4"
                          size={40}
                        />
                        <p className="text-red-600 text-sm">
                          {serviceError?.data?.message ||
                            serviceError?.message ||
                            "Failed to load service data"}
                        </p>
                        <button
                          onClick={refetchService}
                          className="mt-3 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : !serviceData?.schedules?.length ? (
                      <div className="text-center py-10">
                        <Calendar
                          className="mx-auto text-gray-400 mb-3"
                          size={40}
                        />
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          No Services Found
                        </h4>
                        <p className="text-sm text-gray-500">
                          No service schedules found for this product.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Header row */}
                        <div className="grid grid-cols-[1fr_auto] gap-3 px-3 pb-1 border-b border-gray-100">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Service Info
                          </p>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                            Actions
                          </p>
                        </div>

                        {serviceData.schedules.map((schedule) => (
                          <div
                            key={schedule._id}
                            className={`grid grid-cols-[1fr_auto] gap-3 items-start p-3 rounded-lg border ${
                              schedule.status === "overdue"
                                ? "bg-red-50 border-red-100"
                                : schedule.status === "completed"
                                  ? "bg-green-50 border-green-100"
                                  : schedule.status === "cancelled"
                                    ? "bg-gray-50 border-gray-100"
                                    : "bg-blue-50 border-blue-100"
                            }`}
                          >
                            {/* Left: service details */}
                            <div className="min-w-0 space-y-1.5">
                              {/* Row 1: Status badge + date */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getServiceStatusColor(schedule.status)}`}
                                >
                                  {getServiceStatusIcon(schedule.status)}
                                  <span className="capitalize">
                                    {schedule.status}
                                  </span>
                                </span>
                                <span className="text-xs font-semibold text-gray-700">
                                  {formatDate(schedule.scheduled_date)}
                                </span>
                                {schedule.completed_at && (
                                  <span className="text-xs text-gray-400">
                                    · Done {formatDate(schedule.completed_at)}
                                  </span>
                                )}
                              </div>

                              {/* Row 2: Description */}
                              {(schedule.service_description ||
                                serviceData.plan?.service_description) && (
                                <p className="text-xs text-gray-600 truncate">
                                  {schedule.service_description ||
                                    serviceData.plan?.service_description}
                                </p>
                              )}

                              {/* Row 3: Charge + Amount collected */}
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs text-gray-500">
                                  Charge:{" "}
                                  <span className="font-medium text-gray-700">
                                    {schedule.service_charge
                                      ? `₹${schedule.service_charge.toLocaleString("en-IN")}`
                                      : serviceData.plan?.service_charge
                                        ? `₹${serviceData.plan.service_charge.toLocaleString("en-IN")}`
                                        : "Free"}
                                  </span>
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    schedule.payment_status === "PAID"
                                      ? "bg-green-100 text-green-800"
                                      : schedule.payment_status === "PARTIAL"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : schedule.payment_status === "FREE"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {schedule.amount_collected
                                    ? `₹${schedule.amount_collected.toLocaleString("en-IN")}`
                                    : "₹0"}{" "}
                                  ({schedule.payment_status || "PENDING"})
                                </span>
                              </div>
                            </div>

                            {/* Right: actions */}
                            <div className="flex flex-col gap-1.5 shrink-0">
                              {(schedule.status === "scheduled" ||
                                schedule.status === "overdue") && (
                                <>
                                  <button
                                    onClick={() => {
                                      const serviceCharge =
                                        schedule.service_charge ||
                                        serviceData.plan?.service_charge ||
                                        0;
                                      setAmountCollected(serviceCharge);
                                      setPaymentMethod(
                                        serviceCharge === 0 ? "NONE" : "CASH",
                                      );
                                      setTechnicianName("");
                                      setCompletionNotes("MAINTENANCE");
                                      setIssueReported(
                                        "Regular maintenance service",
                                      );
                                      setWorkDone(
                                        "Service completed successfully",
                                      );
                                      setShowCompleteModal(schedule._id);
                                    }}
                                    disabled={actionLoading}
                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {markingComplete ? (
                                      <LoadingSpinner size="xs" />
                                    ) : (
                                      <CheckCircle2 size={11} />
                                    )}
                                    Complete
                                  </button>
                                  <button
                                    onClick={() =>
                                      setShowRescheduleModal(schedule._id)
                                    }
                                    disabled={actionLoading}
                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {rescheduling ? (
                                      <LoadingSpinner size="xs" />
                                    ) : (
                                      <RotateCcw size={11} />
                                    )}
                                    Reschedule
                                  </button>
                                  {schedule.status === "scheduled" && (
                                    <button
                                      onClick={() =>
                                        cancelService(schedule._id)
                                      }
                                      disabled={actionLoading}
                                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {cancelling ? (
                                        <LoadingSpinner size="xs" />
                                      ) : (
                                        <XCircle size={11} />
                                      )}
                                      Cancel
                                    </button>
                                  )}
                                </>
                              )}
                              {(schedule.status === "completed" ||
                                schedule.status === "cancelled") && (
                                <span className="text-gray-400 text-xs italic">
                                  —
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Actions */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-4">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Quick Actions
                  </h3>

                  {/* Customer summary */}
                  {product.customer && (
                    <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <p className="text-xs font-medium text-indigo-500 mb-0.5 flex items-center gap-1">
                        <User className="w-3 h-3" /> Customer
                      </p>
                      <p className="text-sm font-semibold text-indigo-800">
                        {product.customer.full_name}
                      </p>
                      <a
                        href={`tel:${product.customer.whatsapp_number}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        {product.customer.whatsapp_number}
                      </a>
                    </div>
                  )}
                  <div className="space-y-3">
                    {product.invoice_id && (
                      <button
                        onClick={() =>
                          navigate(`${ROUTES.INVOICES}/${product.invoice_id}`)
                        }
                        className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            View Invoice
                          </p>
                          {product.invoice?.invoice_number && (
                            <p className="text-xs text-gray-400 font-mono">
                              {product.invoice.invoice_number}
                            </p>
                          )}
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => setShowEditProductModal(true)}
                      className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group"
                    >
                      <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <Edit className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
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
                <span>Mark Service Complete</span>
              </div>
            }
            onClose={() => setShowCompleteModal(null)}
          />
          <DialogBody>
            <div className="space-y-6">
              <p className="text-gray-600">
                Complete the service and record payment details (if applicable).
              </p>

              {serviceData?.schedules?.find(
                (s) => s._id === showCompleteModal,
              ) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Service Details
                  </h4>
                  <p className="text-sm text-gray-600">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Collected *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">
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
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (e.target.value === "NONE") setAmountCollected(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Technician Name *
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter technician name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type *
                  </label>
                  <select
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Reported *
                  </label>
                  <textarea
                    value={issueReported}
                    onChange={(e) => setIssueReported(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="3"
                    placeholder="Describe the issue reported by customer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Done *
                  </label>
                  <textarea
                    value={workDone}
                    onChange={(e) => setWorkDone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="3"
                    placeholder="Describe the work performed"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
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
                    <span>Complete Service</span>
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
                <span>Reschedule Service</span>
              </div>
            }
            onClose={() => setShowRescheduleModal(null)}
          />
          <DialogBody>
            <div className="space-y-4">
              <p className="text-gray-600">
                Select a new date for this service.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Service Date *
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
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
                    <span>Reschedule</span>
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
            <span>Edit Service Plan</span>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                Update the service plan configuration. Pending schedules will be
                regenerated based on new settings. Completed services are
                preserved.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Interval Type *
                  </label>
                  <select
                    value={planIntervalType}
                    onChange={(e) => setPlanIntervalType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly (3 months)</option>
                    <option value="HALF_YEARLY">Half-Yearly (6 months)</option>
                    <option value="YEARLY">Yearly (12 months)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interval Value *
                  </label>
                  <input
                    type="number"
                    value={planIntervalValue}
                    onChange={(e) => setPlanIntervalValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="1"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Services *
                  </label>
                  <input
                    type="number"
                    value={planTotalServices}
                    onChange={(e) => setPlanTotalServices(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="1"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Start Date *
                  </label>
                  <input
                    type="date"
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Charge (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={planCharge}
                      onChange={(e) => setPlanCharge(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                      step="1"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Description
                  </label>
                  <textarea
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows="3"
                    placeholder="Describe the service to be performed..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
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
                    <span>Save Changes</span>
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
