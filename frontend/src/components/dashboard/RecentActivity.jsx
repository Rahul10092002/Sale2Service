import React from "react";
import { FileText, Clock, Wrench, Send, AlertTriangle, CheckCircle, Smartphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/**
 * RecentActivity — feed of recent business activities with dark mode support.
 */
const RecentActivity = ({ data, limit = 5 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-gray-100 dark:border-dark-border p-3">
        <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
          Recent Activity
        </h3>
        <div className="text-center text-xs text-ink-muted dark:text-slate-500 py-4">
          No recent activity
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "PAID":
      case "COMPLETED":
      case "SENT":
      case "DELIVERED":
      case "READ":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      case "PARTIAL":
      case "SCHEDULED":
      case "PENDING":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
      case "UNPAID":
      case "CANCELLED":
      case "MISSED":
      case "FAILED":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-dark-subtle text-gray-800 dark:text-slate-300";
    }
  };

  const formatTimestamp = (activity) => {
    const timestamp = activity.timestamp || activity.createdAt || activity.sent_at;
    if (!timestamp) return "Unknown time";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Invalid date";
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Invalid date";
    }
  };

  const getActivityTitle = (activity) => {
    if (activity.title) return activity.title;
    const typeLabel =
      activity.entity_type === "INVOICE"  ? "Invoice"  :
      activity.entity_type === "PRODUCT"  ? "Product"  :
      activity.entity_type === "CUSTOMER" ? "Customer" : "Activity";
    return `${typeLabel} message sent`;
  };

  const getActivityDescription = (activity) => {
    if (activity.description) return activity.description;
    const parts = [];
    if (activity.recipient_name) parts.push(`To: ${activity.recipient_name}`);
    if (activity.message_status) parts.push(activity.message_status);
    return parts.join(" · ") || "";
  };

  const displayData = data.slice(0, limit);

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-gray-100 dark:border-dark-border p-3">
      <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
        Recent Activity
      </h3>
      <div className="space-y-1.5">
        {displayData.map((activity, index) => (
          <div
            key={activity.id || index}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors"
          >
            <div className={`p-1.5 rounded-md shrink-0 ${
              activity.type === 'service' ? 'bg-orange-50 dark:bg-orange-900/30' : 
              activity.type === 'reminder' ? 'bg-green-50 dark:bg-green-900/30' :
              'bg-blue-50 dark:bg-blue-900/30'
            }`}>
              {activity.type === 'service' ? (
                <Wrench className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              ) : activity.type === 'reminder' ? (
                <Smartphone className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink-base dark:text-slate-100 truncate">
                  {getActivityTitle(activity)}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3 text-ink-muted dark:text-slate-500" />
                  <span className="text-[10px] text-ink-muted dark:text-slate-500">
                    {formatTimestamp(activity)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-ink-secondary dark:text-slate-400 truncate">
                {getActivityDescription(activity)}
              </p>
            </div>
            {activity.status && (
              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getStatusColor(activity.status)}`}>
                {activity.status}
              </span>
            )}
          </div>
        ))}
      </div>
      {data.length > limit && (
        <button className="w-full mt-2 text-xs text-primary dark:text-primary-dark hover:underline font-medium">
          View all activity →
        </button>
      )}
    </div>
  );
};

export default RecentActivity;
