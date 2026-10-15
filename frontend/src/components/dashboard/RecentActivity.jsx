import React from "react";
import { FileText, Clock, Wrench, Send, AlertTriangle, CheckCircle, Smartphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/**
 * RecentActivity — feed of recent business activities with dark mode support.
 */
const RecentActivity = ({ data, limit = 5 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-slate-200/80 dark:border-dark-border p-3.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
          Recent Activity
        </h3>
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 py-4 font-medium">
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
        return "bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200/60 dark:border-green-800/60";
      case "PARTIAL":
      case "SCHEDULED":
      case "PENDING":
        return "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60";
      case "UNPAID":
      case "CANCELLED":
      case "MISSED":
      case "FAILED":
        return "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60";
      default:
        return "bg-slate-100 dark:bg-dark-subtle text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-dark-border";
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
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-slate-200/80 dark:border-dark-border p-3.5">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2.5">
        Recent Activity
      </h3>
      <div className="space-y-1.5">
        {displayData.map((activity, index) => (
          <div
            key={activity.id || index}
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-hover transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-dark-border"
          >
            <div className={`p-1.5 rounded-md shrink-0 border ${
              activity.type === 'service' ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/40' : 
              activity.type === 'reminder' ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/40' :
              'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/40'
            }`}>
              {activity.type === 'service' ? (
                <Wrench className="w-3.5 h-3.5" />
              ) : activity.type === 'reminder' ? (
                <Smartphone className="w-3.5 h-3.5" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {getActivityTitle(activity)}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {formatTimestamp(activity)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5">
                {getActivityDescription(activity)}
              </p>
            </div>
            {activity.status && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${getStatusColor(activity.status)}`}>
                {activity.status}
              </span>
            )}
          </div>
        ))}
      </div>
      {data.length > limit && (
        <button className="w-full mt-2.5 pt-2 border-t border-slate-100 dark:border-dark-border text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold hover:underline transition-colors text-center">
          View all activity →
        </button>
      )}
    </div>
  );
};

export default RecentActivity;
