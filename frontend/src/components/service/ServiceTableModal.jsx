import React, { useState, useEffect } from "react";
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

  // Service management functions
  const markServiceComplete = async (scheduleId) => {
    console.log("markServiceComplete called with scheduleId:", scheduleId);

    try {
      console.log("Calling markComplete mutation with:", {
        id: scheduleId,
        notes: completionNotes,
      });

      const result = await markComplete({
        id: scheduleId,
        notes: completionNotes,
      }).unwrap();

      console.log("markComplete result:", result);

      // Show success message
      alert("Service marked as completed successfully!");

      refetch();
      setShowCompleteModal(null);
      setCompletionNotes("");
    } catch (err) {
      console.error("Mark complete error:", err);
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        "Failed to mark service as complete";
      alert(`Error: ${errorMessage}`);
    }
  };

  const rescheduleService = async (scheduleId) => {
    try {
      if (!rescheduleDate) {
        alert("Please select a new date for the service.");
        return;
      }

      const result = await rescheduleServiceMutation({
        id: scheduleId,
        new_date: rescheduleDate,
        reschedule_reason: "Rescheduled by user",
      }).unwrap();

      // Show success message
      alert("Service rescheduled successfully!");

      refetch();
      setShowRescheduleModal(null);
      setRescheduleDate("");
    } catch (err) {
      console.error("Reschedule error:", err);
      const errorMessage =
        err?.data?.message || err?.message || "Failed to reschedule service";
      alert(`Error: ${errorMessage}`);
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
      alert("Service cancelled successfully!");

      refetch();
    } catch (err) {
      console.error("Cancel error:", err);
      const errorMessage =
        err?.data?.message || err?.message || "Failed to cancel service";
      alert(`Error: ${errorMessage}`);
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
        return <XCircle className="text-gray-600" size={16} />;
      default:
        return <Clock className="text-gray-600" size={16} />;
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
          maxWidth="6xl"
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
                <span className="ml-2">Loading service data...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                <p className="text-red-600">
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
                <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Services Found
                </h3>
                <p className="text-gray-600">
                  No service schedules found for this product.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {serviceData.schedules.map((schedule) => (
                      <tr key={schedule._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(schedule.scheduled_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              schedule.status,
                            )}`}
                          >
                            {getStatusIcon(schedule.status)}
                            <span className="ml-1 capitalize">
                              {schedule.status}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {schedule.service_description ||
                            serviceData.plan?.service_description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {schedule.completed_at
                            ? formatDate(schedule.completed_at)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {schedule.notes || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {schedule.status === "scheduled" && (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  console.log(
                                    "Table Complete button clicked for schedule:",
                                    schedule._id,
                                  );
                                  setShowCompleteModal(schedule._id);
                                }}
                                disabled={actionLoading}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                onClick={() =>
                                  setShowCompleteModal(schedule._id)
                                }
                                disabled={actionLoading}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                            <span className="text-gray-400 text-xs italic">
                              No actions available
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          maxWidth="md"
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
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to mark this service as completed?
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Notes (Optional)
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows="3"
                  placeholder="Add any notes about the service completion..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setShowCompleteModal(null)}
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
                    <span>Mark Complete</span>
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
                  required
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
