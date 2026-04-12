import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";
import {
  X,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Edit3,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Eye,
  FileText,
} from "lucide-react";
import { Dialog as Modal, DialogHeader, DialogBody } from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import LoadingSpinner from "../ui/LoadingSpinner.jsx";
import {
  useGetServicesByProductQuery,
  useRescheduleServiceMutation,
  useMarkServiceCompleteMutation,
  useCancelServiceMutation,
} from "../../features/services/serviceApi.js";
import { useGetInvoiceItemServicesQuery } from "../../features/invoices/invoiceApi.js";

/**
 * Service Table Modal
 * Shows services of a product in a tabular format with management actions
 */
export const ServiceTableModal = ({
  itemId,
  invoiceId,
  product,
  isOpen,
  onClose,
}) => {
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

  // RTK Query hooks
  const {
    data: serviceData,
    isLoading: loading,
    error,
    refetch,
  } = useGetInvoiceItemServicesQuery(
    { invoiceId, itemId },
    { skip: !isOpen || !itemId || !invoiceId },
  );

  // RTK Query mutations
  const [markComplete, { isLoading: markingComplete }] =
    useMarkServiceCompleteMutation();
  const [rescheduleServiceMutation, { isLoading: rescheduling }] =
    useRescheduleServiceMutation();
  const [cancelServiceMutation, { isLoading: cancelling }] =
    useCancelServiceMutation();

  const actionLoading = markingComplete || rescheduling || cancelling;
  const dispatch = useDispatch();

  // Service management functions
  const markServiceComplete = async (scheduleId) => {
    console.log("markServiceComplete called with scheduleId:", scheduleId);

    // Comprehensive validation for required fields
    const errors = [];

    if (!issueReported.trim()) {
      errors.push("Issue reported is required");
    }

    if (!workDone.trim()) {
      errors.push("Work done description is required");
    }

    if (!technicianName.trim()) {
      errors.push("Technician name is required");
    }

    if (!completionNotes.trim()) {
      errors.push("Service type is required");
    }

    // Validate payment amount
    if (amountCollected < 0) {
      errors.push("Amount collected cannot be negative");
    }

    if (paymentMethod !== "NONE" && amountCollected === 0) {
      errors.push(
        "Amount collected is required when payment method is selected",
      );
    }

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
      const completeData = {
        id: scheduleId,
        amount_collected: parseFloat(amountCollected) || 0,
        payment_method: paymentMethod,
        technician_name: technicianName.trim(),
        service_type: completionNotes || "MAINTENANCE",
        issue_reported: issueReported.trim(),
        work_done: workDone.trim(),
      };

      console.log("Calling markComplete mutation with:", completeData);

      const result = await markComplete(completeData).unwrap();

      console.log("markComplete result:", result);

      // Show success message
      dispatch(
        showToast({
          message: "Service marked as completed successfully!",
          type: "success",
        }),
      );

      refetch();
      setShowCompleteModal(null);
      // Reset form fields
      setAmountCollected(0);
      setPaymentMethod("CASH");
      setTechnicianName("");
      setCompletionNotes("MAINTENANCE");
      setIssueReported("Regular maintenance service");
      setWorkDone("Service completed successfully");
    } catch (err) {
      console.error("Mark complete error:", err);
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        "Failed to mark service as complete";
      dispatch(showToast({ message: errorMessage, type: "error" }));
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

      const result = await rescheduleServiceMutation({
        id: scheduleId,
        new_date: rescheduleDate,
        reschedule_reason: "Rescheduled by user",
      }).unwrap();

      // Show success message
      dispatch(
        showToast({
          message: "Service rescheduled successfully!",
          type: "success",
        }),
      );

      refetch();
      setShowRescheduleModal(null);
      setRescheduleDate("");
    } catch (err) {
      console.error("Reschedule error:", err);
      const errorMessage =
        err?.data?.message || err?.message || "Failed to reschedule service";
      dispatch(showToast({ message: errorMessage, type: "error" }));
    }
  };

  const cancelService = async (scheduleId) => {
    if (
      !confirm(
        "Are you sure you want to cancel this service? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const result = await cancelServiceMutation({
        id: scheduleId,
        reason: "Cancelled by user",
      }).unwrap();

      // Show success message
      dispatch(
        showToast({
          message: "Service cancelled successfully!",
          type: "success",
        }),
      );

      refetch();
    } catch (err) {
      console.error("Cancel error:", err);
      const errorMessage =
        err?.data?.message || err?.message || "Failed to cancel service";
      dispatch(showToast({ message: errorMessage, type: "error" }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusIcon = (status) => {
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

  const getStatusColor = (status) => {
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

  if (!isOpen) return null;

  return (
    <React.Fragment>
      {/* Main Service Table Modal - Hide when showing other modals */}
      {!showCompleteModal && !showRescheduleModal && (
        <Modal
          open={isOpen}
          onClose={onClose}
          maxWidth="4xl"
          className="z-[50]"
        >
          <DialogHeader
            title={
              <div className="flex items-center space-x-2">
                <FileText className="text-indigo-600" size={20} />
                <span>Service Table - {product?.product_name}</span>
              </div>
            }
            onClose={onClose}
          />
          <DialogBody>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <LoadingSpinner />
                <span className="ml-2 text-ink-secondary dark:text-slate-400">Loading service data...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                <p className="text-red-600 dark:text-red-400">
                  {error?.data?.message ||
                    error?.message ||
                    "Failed to load service data"}
                </p>
                <Button onClick={refetch} variant="secondary" className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : !serviceData?.schedules?.length ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto text-gray-400 dark:text-slate-500 mb-4" size={48} />
                <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
                  No Services Found
                </h3>
                <p className="text-ink-secondary dark:text-slate-400">
                  No service schedules found for this product.
                </p>
              </div>
            ) : (
              <div className="w-full">
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
                          <td className="py-2 px-2 text-xs text-ink-base dark:text-slate-200 whitespace-nowrap">
                            {formatDate(schedule.scheduled_date)}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(schedule.status)}`}
                            >
                              <span className="capitalize">{schedule.status}</span>
                            </span>
                          </td>
                          <td className="py-2 px-2 text-xs text-ink-secondary dark:text-slate-400 max-w-[150px] truncate">
                            {schedule.service_description || serviceData.plan?.service_description || "—"}
                          </td>
                          <td className="py-2 px-2 text-xs font-medium text-ink-base dark:text-slate-200 whitespace-nowrap">
                            {schedule.service_charge
                              ? `₹${schedule.service_charge.toLocaleString("en-IN")}`
                              : serviceData.plan?.service_charge
                                ? `₹${serviceData.plan.service_charge.toLocaleString("en-IN")}`
                                : "Free"}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
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
                            <div className="flex items-center justify-end gap-1.5 min-w-[max-content]">
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
              </div>
            )}
          </DialogBody>
        </Modal>
      )}

      {/* Complete Service Modal - Rendered separately to avoid modal conflicts */}
      {showCompleteModal && (
        <Modal
          open={true}
          onClose={() => setShowCompleteModal(null)}
          maxWidth="xl"
          className="z-[60]"
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
              <p className="text-ink-secondary dark:text-slate-400">
                Complete the service and record payment details (if applicable).
              </p>

              {/* Service Details Display */}
              {serviceData?.schedules?.find(
                (s) => s._id === showCompleteModal,
              ) && (
                <div className="bg-gray-50 dark:bg-dark-subtle p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
                    Service Details
                  </h4>
                  <div className="text-sm text-ink-secondary dark:text-slate-400">
                    <p>
                      Service Charge:{" "}
                      {serviceData.schedules.find(
                        (s) => s._id === showCompleteModal,
                      )?.service_charge || serviceData.plan?.service_charge
                        ? `₹${(
                            serviceData.schedules.find(
                              (s) => s._id === showCompleteModal,
                            )?.service_charge ||
                            serviceData.plan?.service_charge
                          ).toLocaleString("en-IN")}`
                        : "Free"}
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Information */}
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
                        if (value >= 0) {
                          setAmountCollected(value);
                        }
                      }}
                      onBlur={() => setRawAmountCollected(null)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0"
                      min="0"
                      step="1"
                      required
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
                      if (e.target.value === "NONE") {
                        setAmountCollected(0);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
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

              {/* Service Details */}
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
                    placeholder="Enter technician name (required)"
                    required
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
                    required
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

              {/* Issue and Work Description */}
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
                    placeholder="Describe the issue reported by customer (required)"
                    required
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
                    placeholder="Describe the work performed (required)"
                    required
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
                    console.log(
                      "Complete button clicked, showCompleteModal:",
                      showCompleteModal,
                    );
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

      {/* Reschedule Service Modal - Rendered separately to avoid modal conflicts */}
      {showRescheduleModal && (
        <Modal
          open={true}
          onClose={() => setShowRescheduleModal(null)}
          maxWidth="md"
          className="z-[60]"
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
                  required
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
                    console.log(
                      "Reschedule button clicked, showRescheduleModal:",
                      showRescheduleModal,
                    );
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
    </React.Fragment>
  );
};
