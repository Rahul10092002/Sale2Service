import React, { useState } from "react";
import { Clock, Wrench, Calendar, Plus } from "lucide-react";
import Button from "../ui/Button.jsx";
import { ServiceHistoryModal } from "./ServiceHistoryModal.jsx";
import { ScheduleServiceModal } from "./ScheduleServiceModal.jsx";

/**
 * Service Integration Component
 * Shows service status and quick actions for a product/invoice item
 */
export const ServiceIntegration = ({
  itemId,
  invoiceId,
  product,
  size = "default",
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // Size variants for different contexts
  const sizeClasses = {
    small: "text-xs space-x-1",
    default: "text-sm space-x-2",
    large: "text-base space-x-3",
  };

  const iconSizes = {
    small: 12,
    default: 16,
    large: 20,
  };

  return (
    <>
      <div className={`flex items-center justify-between ${sizeClasses[size]}`}>
        {/* Service Status */}
        <div className="flex items-center space-x-1">
          <Wrench size={iconSizes[size]} className="text-blue-600" />
          <span className="text-gray-600">Service</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size={size === "small" ? "sm" : "xs"}
            onClick={() => setShowHistory(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            <Calendar size={iconSizes[size]} />
            {size !== "small" && "History"}
          </Button>

          <Button
            variant="ghost"
            size={size === "small" ? "sm" : "xs"}
            onClick={() => setShowSchedule(true)}
            className="text-green-600 hover:text-green-700"
          >
            <Plus size={iconSizes[size]} />
            {size !== "small" && "Schedule"}
          </Button>
        </div>
      </div>

      {/* Service History Modal */}
      {showHistory && (
        <ServiceHistoryModal
          itemId={itemId}
          invoiceId={invoiceId}
          product={product}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Schedule Service Modal */}
      {showSchedule && (
        <ScheduleServiceModal
          itemId={itemId}
          invoiceId={invoiceId}
          product={product}
          isOpen={showSchedule}
          onClose={() => setShowSchedule(false)}
          onScheduled={() => {
            setShowSchedule(false);
            // Refresh data if needed
          }}
        />
      )}
    </>
  );
};

/**
 * Compact Service Badge for product listings
 */
export const ServiceBadge = ({
  itemId,
  invoiceId,
  product,
  hasService = false,
  nextServiceDate = null,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  const getBadgeColor = () => {
    if (!hasService) return "bg-gray-100 text-gray-600";

    if (nextServiceDate) {
      const days = Math.ceil(
        (new Date(nextServiceDate) - new Date()) / (1000 * 60 * 60 * 24),
      );
      if (days < 0) return "bg-red-100 text-red-700"; // Overdue
      if (days <= 7) return "bg-yellow-100 text-yellow-700"; // Due soon
      return "bg-green-100 text-green-700"; // Upcoming
    }

    return "bg-blue-100 text-blue-700";
  };

  const getBadgeText = () => {
    if (!hasService) return "No Service";

    if (nextServiceDate) {
      const days = Math.ceil(
        (new Date(nextServiceDate) - new Date()) / (1000 * 60 * 60 * 24),
      );
      if (days < 0) return `${Math.abs(days)}d overdue`;
      if (days <= 7) return `${days}d remaining`;
      return `${days}d remaining`;
    }

    return "Service Active";
  };

  return (
    <>
      <button
        onClick={() => setShowHistory(true)}
        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80 ${getBadgeColor()}`}
      >
        <Clock size={12} />
        <span>{getBadgeText()}</span>
      </button>

      {showHistory && (
        <ServiceHistoryModal
          itemId={itemId}
          invoiceId={invoiceId}
          product={product}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
};
