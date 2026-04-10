import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";
import {
  X,
  Calendar,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit3,
  MoreVertical,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
  Phone,
  MapPin,
} from "lucide-react";
import { Dialog as Modal, DialogHeader, DialogBody } from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import LoadingSpinner from "../ui/LoadingSpinner.jsx";
import { ScheduleServiceModal } from "./index.js";
import {
  useGetServicesByProductQuery,
  useRescheduleServiceMutation,
  useMarkServiceCompleteMutation,
  useCancelServiceMutation,
} from "../../features/services/serviceApi.js";

/**
 * Service History Modal
 * Shows complete service history and schedules for a product
 */
export const ServiceHistoryModal = ({
  itemId,
  invoiceId,
  product,
  isOpen,
  onClose,
}) => {
  const [serviceData, setServiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  // RTK Query mutations
  const [markComplete, { isLoading: markingComplete }] =
    useMarkServiceCompleteMutation();
  const [rescheduleServiceMutation, { isLoading: rescheduling }] =
    useRescheduleServiceMutation();
  const [cancelServiceMutation, { isLoading: cancelling }] =
    useCancelServiceMutation();

  const actionLoading = markingComplete || rescheduling || cancelling;
  const dispatch = useDispatch();

  useEffect(() => {
    if (isOpen && itemId) {
      fetchServiceData();
    }
  }, [isOpen, itemId]);

  const fetchServiceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/invoices/${invoiceId}/items/${itemId}/services`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch service data");
      }

      setServiceData(result.data);
    } catch (err) {
      console.error("Fetch service data error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark service as complete
  const markServiceComplete = async (scheduleId) => {
    try {
      const result = await markComplete({
        id: scheduleId,
        notes: completionNotes,
      }).unwrap();

      // Refresh service data
      await fetchServiceData();
      setShowCompleteModal(null);
      setCompletionNotes("");
    } catch (err) {
      console.error("Mark complete error:", err);
      dispatch(
        showToast({
          message: err.message || "Failed to mark service as complete",
          type: "error",
        }),
      );
    }
  };

  // Reschedule service
  const rescheduleService = async (scheduleId) => {
    try {
      const result = await rescheduleServiceMutation({
        id: scheduleId,
        new_date: rescheduleDate,
        reschedule_reason: "Rescheduled by user",
      }).unwrap();

      // Refresh service data
      await fetchServiceData();
      setShowRescheduleModal(null);
      setRescheduleDate("");
    } catch (err) {
      console.error("Reschedule error:", err);
      dispatch(
        showToast({
          message: err.message || "Failed to reschedule service",
          type: "error",
        }),
      );
    }
  };

  // Cancel service
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

      // Refresh service data
      await fetchServiceData();
    } catch (err) {
      console.error("Cancel error:", err);
      dispatch(
        showToast({
          message: err.message || "Failed to cancel service",
          type: "error",
        }),
      );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getScheduleStatus = (schedule) => {
    const today = new Date();
    const scheduledDate = new Date(schedule.scheduled_date);

    if (schedule.service_visits && schedule.service_visits.length > 0) {
      return "completed";
    }

    if (scheduledDate < today) {
      return "overdue";
    }

    const daysUntil = Math.ceil(
      (scheduledDate - today) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil <= 7) {
      return "due-soon";
    }

    return "upcoming";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="text-green-600" size={16} />;
      case "overdue":
        return <AlertCircle className="text-red-600" size={16} />;
      case "due-soon":
        return <Clock className="text-yellow-600" size={16} />;
      default:
        return <Calendar className="text-blue-600" size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-50 border-green-200 text-green-800";
      case "overdue":
        return "bg-red-50 border-red-200 text-red-800";
      case "due-soon":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center space-x-2">
            <Wrench className="text-blue-600" size={20} />
            <span>Service History</span>
          </div>
        }
        size="lg"
      >
        <div className="space-y-6">
          {/* Product Information */}
          <div className="bg-gray-50 dark:bg-dark-subtle p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">
              Product Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-ink-secondary dark:text-slate-400">Product:</span>
                <span className="ml-2 font-medium">
                  {product?.product_name}
                </span>
              </div>
              {product?.serial_number && (
                <div>
                  <span className="text-ink-secondary dark:text-slate-400">Serial:</span>
                  <span className="ml-2 font-medium">
                    {product.serial_number}
                  </span>
                </div>
              )}
              {product?.company && (
                <div>
                  <span className="text-ink-secondary dark:text-slate-400">Brand:</span>
                  <span className="ml-2 font-medium">{product.company}</span>
                </div>
              )}
              {product?.model_number && (
                <div>
                  <span className="text-ink-secondary dark:text-slate-400">Model:</span>
                  <span className="ml-2 font-medium">
                    {product.model_number}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2 text-ink-secondary dark:text-slate-400">
                Loading service data...
              </span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle size={16} />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Service Data */}
          {!loading && !error && serviceData && (
            <div className="space-y-4">
              {!serviceData.hasServicePlan ? (
                /* No Service Plan */
                <div className="text-center py-8">
                  <Wrench className="mx-auto text-gray-400" size={48} />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No Service Plan
                  </h3>
                  <p className="mt-2 text-ink-secondary dark:text-slate-400">
                    This product doesn't have a service plan configured.
                  </p>
                  <Button
                    onClick={() => setShowScheduleModal(true)}
                    className="mt-4"
                    variant="primary"
                  >
                    <Plus size={16} />
                    Create Service Plan
                  </Button>
                </div>
              ) : (
                /* Service Plan Exists */
                <>
                  {/* Service Plan Info */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Service Plan
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-blue-600 font-medium">
                            Interval:
                          </span>
                          <p className="text-blue-800">
                            Every{" "}
                            {serviceData.servicePlan.service_interval_value}{" "}
                            {serviceData.servicePlan.service_interval_type}(s)
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-600 font-medium">
                            Total Services:
                          </span>
                          <p className="text-blue-800">
                            {serviceData.servicePlan.total_services}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-600 font-medium">
                            Start Date:
                          </span>
                          <p className="text-blue-800">
                            {formatDate(
                              serviceData.servicePlan.service_start_date,
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-600 font-medium">
                            End Date:
                          </span>
                          <p className="text-blue-800">
                            {formatDate(
                              serviceData.servicePlan.service_end_date,
                            )}
                          </p>
                        </div>
                      </div>
                      {serviceData.servicePlan.service_description && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <span className="text-blue-600 font-medium">
                            Description:
                          </span>
                          <p className="text-blue-800 mt-1">
                            {serviceData.servicePlan.service_description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service Schedule */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Service Schedule
                    </h3>
                    {serviceData.schedules &&
                    serviceData.schedules.length > 0 ? (
                      <div className="space-y-3">
                        {serviceData.schedules.map((schedule, index) => {
                          const status = getScheduleStatus(schedule);
                          const canComplete =
                            status === "upcoming" ||
                            status === "due-soon" ||
                            status === "overdue";
                          const canReschedule =
                            status !== "completed" && status !== "cancelled";
                          const canCancel =
                            status !== "completed" && status !== "cancelled";

                          return (
                            <div
                              key={schedule._id}
                              className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3 flex-1">
                                  {getStatusIcon(status)}
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <p className="font-medium text-gray-900">
                                        Service #{index + 1}
                                      </p>
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}
                                      >
                                        {status.charAt(0).toUpperCase() +
                                          status.slice(1).replace("-", " ")}
                                      </span>
                                    </div>

                                    <div className="mt-1 space-y-1">
                                      <div className="flex items-center space-x-2 text-sm text-ink-secondary dark:text-slate-400">
                                        <Calendar size={14} />
                                        <span>
                                          Scheduled:{" "}
                                          {formatDate(schedule.scheduled_date)}
                                        </span>
                                      </div>

                                      {schedule.service_visits &&
                                        schedule.service_visits.length > 0 && (
                                          <div className="flex items-center space-x-2 text-sm text-green-600">
                                            <CheckCircle2 size={14} />
                                            <span>
                                              Completed:{" "}
                                              {formatDate(
                                                schedule.service_visits[0]
                                                  .visit_date,
                                              )}
                                            </span>
                                          </div>
                                        )}

                                      {schedule.rescheduled_from && (
                                        <div className="flex items-center space-x-2 text-sm text-yellow-600">
                                          <RotateCcw size={14} />
                                          <span>
                                            Rescheduled from:{" "}
                                            {formatDate(
                                              schedule.rescheduled_from,
                                            )}
                                          </span>
                                        </div>
                                      )}

                                      {schedule.service_charge &&
                                        Number(schedule.service_charge) > 0 && (
                                          <div className="text-sm text-ink-secondary dark:text-slate-400">
                                            Charge: ₹
                                            {Number(
                                              schedule.service_charge,
                                            ).toFixed(2)}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center space-x-2 ml-4">
                                  {canComplete && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setShowCompleteModal(schedule._id)
                                      }
                                      disabled={actionLoading === schedule._id}
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                      <CheckCircle2 size={16} />
                                      <span className="hidden sm:inline ml-1">
                                        Complete
                                      </span>
                                    </Button>
                                  )}

                                  {canReschedule && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setShowRescheduleModal(schedule._id)
                                      }
                                      disabled={actionLoading === schedule._id}
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                      <Calendar size={16} />
                                      <span className="hidden sm:inline ml-1">
                                        Reschedule
                                      </span>
                                    </Button>
                                  )}

                                  {canCancel && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        cancelService(schedule._id)
                                      }
                                      disabled={actionLoading === schedule._id}
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                      <XCircle size={16} />
                                      <span className="hidden sm:inline ml-1">
                                        Cancel
                                      </span>
                                    </Button>
                                  )}

                                  {actionLoading === schedule._id && (
                                    <div className="flex items-center justify-center">
                                      <LoadingSpinner />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Service Notes */}
                              {schedule.service_description && (
                                <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-ink-secondary dark:text-slate-400">
                                  <div className="flex items-start space-x-2">
                                    <FileText
                                      size={14}
                                      className="mt-0.5 flex-shrink-0"
                                    />
                                    <span>{schedule.service_description}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <Calendar className="mx-auto text-gray-400" size={32} />
                        <p className="mt-2 text-ink-secondary dark:text-slate-400">
                          No service schedules generated yet.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Service Modal */}
      {showScheduleModal && (
        <ScheduleServiceModal
          itemId={itemId}
          invoiceId={invoiceId}
          product={product}
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={() => {
            setShowScheduleModal(false);
            fetchServiceData(); // Refresh data
          }}
        />
      )}

      {/* Complete Service Modal */}
      {showCompleteModal && (
        <Modal
          open={true}
          onClose={() => setShowCompleteModal(null)}
          maxWidth="md"
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
              <p className="text-ink-secondary dark:text-slate-400">
                Are you sure you want to mark this service as completed? This
                will record the service as done.
              </p>

              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
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
                  onClick={() => markServiceComplete(showCompleteModal)}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Mark Complete
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
              <p className="text-ink-secondary dark:text-slate-400">
                Select a new date for this service. The old schedule will be
                updated with the new date.
              </p>

              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2">
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
                  onClick={() => rescheduleService(showRescheduleModal)}
                  disabled={actionLoading || !rescheduleDate}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {actionLoading ? <LoadingSpinner /> : <Calendar size={16} />}
                  Reschedule
                </Button>
              </div>
            </div>
          </DialogBody>
        </Modal>
      )}
    </>
  );
};
