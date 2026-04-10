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
                {/* Desktop Table (lg and above) */}
                <div className="hidden lg:block">
                  <table className="w-full divide-y divide-gray-200 dark:divide-dark-border">
                    <thead className="bg-gray-50 dark:bg-dark-subtle">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary dark:text-slate-400 uppercase">
                          Service Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary dark:text-slate-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary dark:text-slate-400 uppercase">
                          Details
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-ink-secondary dark:text-slate-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                      {serviceData.schedules.map((schedule) => (
                        <tr key={schedule._id} className="hover:bg-gray-50 dark:hover:bg-dark-subtle">
                          {/* Column 1 */}
                          <td className="px-4 py-4 text-sm font-medium text-ink-base dark:text-slate-100">
                            {formatDate(schedule.scheduled_date)}
                          </td>

                          {/* Column 2 */}
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                schedule.status,
                              )}`}
                            >
                              {getStatusIcon(schedule.status)}
                              <span className="ml-1 capitalize">
                                {schedule.status}
                              </span>
                            </span>
                          </td>

                          {/* Column 3 (Merged Details) */}
                          <td className="px-4 py-4 text-sm text-ink-secondary dark:text-slate-300 space-y-1">
                            <div>
                              <strong>Description:</strong>{" "}
                              {schedule.service_description ||
                                serviceData.plan?.service_description}
                            </div>

                            <div>
                              <strong>Charge:</strong>{" "}
                              {schedule.service_charge
                                ? `₹${schedule.service_charge.toLocaleString("en-IN")}`
                                : serviceData.plan?.service_charge
                                  ? `₹${serviceData.plan.service_charge.toLocaleString("en-IN")}`
                                  : "Free"}
                            </div>

                            <div>
                              <strong>Collected:</strong>{" "}
                              {schedule.amount_collected
                                ? `₹${schedule.amount_collected.toLocaleString("en-IN")}`
                                : "₹0"}{" "}
                              ({schedule.payment_status || "PENDING"})
                            </div>

                            <div>
                              <strong>Completed:</strong>{" "}
                              {schedule.completed_at
                                ? formatDate(schedule.completed_at)
                                : "-"}
                            </div>

                            <div>
                              <strong>Notes:</strong> {schedule.notes || "-"}
                            </div>
                          </td>

                          {/* Actions (UNCHANGED) */}
                          <td className="px-4 py-4 text-right text-sm font-medium flex-col gap-2 item-center">
                            {schedule.status === "scheduled" && (
                              <div className="flex flex-col justify-end space-y-2">
                                <button
                                  onClick={() => {
                                    const scheduleData = schedule;
                                    const serviceCharge =
                                      scheduleData.service_charge ||
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
                                  className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                                >
                                  {markingComplete ? (
                                    <LoadingSpinner size="xs" />
                                  ) : (
                                    <CheckCircle2 size={12} className="mr-1" />
                                  )}
                                  Complete
                                </button>

                                <button
                                  onClick={() =>
                                    setShowRescheduleModal(schedule._id)
                                  }
                                  disabled={actionLoading}
                                  className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                                >
                                  {rescheduling ? (
                                    <LoadingSpinner size="xs" />
                                  ) : (
                                    <RotateCcw size={12} className="mr-1" />
                                  )}
                                  Reschedule
                                </button>

                                <button
                                  onClick={() => cancelService(schedule._id)}
                                  disabled={actionLoading}
                                  className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                                >
                                  {cancelling ? (
                                    <LoadingSpinner size="xs" />
                                  ) : (
                                    <XCircle size={12} className="mr-1" />
                                  )}
                                  Cancel
                                </button>
                              </div>
                            )}

                            {schedule.status === "overdue" && (
                              <div className="flex flex-col justify-end space-y-2">
                                <button
                                  onClick={() => {
                                    const scheduleData = schedule;
                                    const serviceCharge =
                                      scheduleData.service_charge ||
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
                                  className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                                >
                                  {markingComplete ? (
                                    <LoadingSpinner size="xs" />
                                  ) : (
                                    <CheckCircle2 size={12} className="mr-1" />
                                  )}
                                  Complete
                                </button>

                                <button
                                  onClick={() =>
                                    setShowRescheduleModal(schedule._id)
                                  }
                                  disabled={actionLoading}
                                  className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                                >
                                  {rescheduling ? (
                                    <LoadingSpinner size="xs" />
                                  ) : (
                                    <RotateCcw size={12} className="mr-1" />
                                  )}
                                  Reschedule
                                </button>
                              </div>
                            )}

                            {(schedule.status === "completed" ||
                              schedule.status === "cancelled") && (
                              <span className="text-ink-muted dark:text-slate-500 text-xs italic">
                                No actions available
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {serviceData.schedules.map((schedule) => (
                    <div
                      key={schedule._id}
                      className="bg-white dark:bg-dark-card p-4 rounded-lg shadow border border-gray-200 dark:border-dark-border"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium text-ink-base dark:text-slate-100">
                          {formatDate(schedule.scheduled_date)}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            schedule.status,
                          )}`}
                        >
                          {schedule.status}
                        </span>
                      </div>

                      <div className="text-sm text-ink-secondary dark:text-slate-400 space-y-1">
                        <div>
                          {schedule.service_description ||
                            serviceData.plan?.service_description}
                        </div>

                        <div>
                          ₹
                          {(
                            schedule.service_charge ||
                            serviceData.plan?.service_charge ||
                            0
                          ).toLocaleString("en-IN")}
                        </div>

                        <div>
                          ₹
                          {(schedule.amount_collected || 0).toLocaleString(
                            "en-IN",
                          )}{" "}
                          ({schedule.payment_status || "PENDING"})
                        </div>
                      </div>

                      {/* Actions SAME */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {schedule.status === "scheduled" && (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                const scheduleData = schedule;
                                const serviceCharge =
                                  scheduleData.service_charge ||
                                  serviceData.plan?.service_charge ||
                                  0;
                                setAmountCollected(serviceCharge);
                                setPaymentMethod(
                                  serviceCharge === 0 ? "NONE" : "CASH",
                                );
                                setTechnicianName("");
                                setCompletionNotes("MAINTENANCE");
                                setIssueReported("Regular maintenance service");
                                setWorkDone("Service completed successfully");
                                setShowCompleteModal(schedule._id);
                              }}
                              disabled={actionLoading}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                            >
                              {markingComplete ? (
                                <LoadingSpinner size="xs" />
                              ) : (
                                <CheckCircle2 size={12} className="mr-1" />
                              )}
                              Complete
                            </button>

                            <button
                              onClick={() =>
                                setShowRescheduleModal(schedule._id)
                              }
                              disabled={actionLoading}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                            >
                              {rescheduling ? (
                                <LoadingSpinner size="xs" />
                              ) : (
                                <RotateCcw size={12} className="mr-1" />
                              )}
                              Reschedule
                            </button>

                            <button
                              onClick={() => cancelService(schedule._id)}
                              disabled={actionLoading}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                            >
                              {cancelling ? (
                                <LoadingSpinner size="xs" />
                              ) : (
                                <XCircle size={12} className="mr-1" />
                              )}
                              Cancel
                            </button>
                          </div>
                        )}

                        {schedule.status === "overdue" && (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                const scheduleData = schedule;
                                const serviceCharge =
                                  scheduleData.service_charge ||
                                  serviceData.plan?.service_charge ||
                                  0;
                                setAmountCollected(serviceCharge);
                                setPaymentMethod(
                                  serviceCharge === 0 ? "NONE" : "CASH",
                                );
                                setTechnicianName("");
                                setCompletionNotes("MAINTENANCE");
                                setIssueReported("Regular maintenance service");
                                setWorkDone("Service completed successfully");
                                setShowCompleteModal(schedule._id);
                              }}
                              disabled={actionLoading}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                            >
                              Complete
                            </button>

                            <button
                              onClick={() =>
                                setShowRescheduleModal(schedule._id)
                              }
                              disabled={actionLoading}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                            >
                              Reschedule
                            </button>
                          </div>
                        )}

                        {(schedule.status === "completed" ||
                          schedule.status === "cancelled") && (
                          <span className="text-ink-muted dark:text-slate-500 text-xs italic">
                            No actions available
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
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
