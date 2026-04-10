import React from "react";
import { FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/**
 * RecentActivity — feed of recent business activities with dark mode support.
 */
const RecentActivity = ({ data, limit = 5 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-gray-100 dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-ink-base dark:text-slate-100 mb-4">
          Recent Activity
        </h3>
        <div className="text-center text-ink-muted dark:text-slate-500 py-8">
          No recent activity
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "PAID":    return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      case "PARTIAL": return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
      case "UNPAID":  return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
      default:        return "bg-gray-100 dark:bg-dark-subtle text-gray-800 dark:text-slate-300";
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
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-gray-100 dark:border-dark-border p-6">
      <h3 className="text-lg font-semibold text-ink-base dark:text-slate-100 mb-4">
        Recent Activity
      </h3>
      <div className="space-y-3">
        {displayData.map((activity, index) => (
          <div
            key={activity.id || index}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors"
          >
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-base dark:text-slate-100 truncate">
                {getActivityTitle(activity)}
              </p>
              <p className="text-sm text-ink-secondary dark:text-slate-400 truncate">
                {getActivityDescription(activity)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3 text-ink-muted dark:text-slate-500" />
                <span className="text-xs text-ink-muted dark:text-slate-500">
                  {formatTimestamp(activity)}
                </span>
              </div>
            </div>
            {activity.status && (
              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(activity.status)}`}>
                {activity.status}
              </span>
            )}
          </div>
        ))}
      </div>
      {data.length > limit && (
        <button className="w-full mt-4 text-sm text-primary dark:text-primary-dark hover:underline font-medium">
          View all activity →
        </button>
      )}
    </div>
  );
};

export default RecentActivity;
