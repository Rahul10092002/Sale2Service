import React from "react";
import { FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/**
 * RecentActivity Component
 * Displays recent business activities in a feed format
 */
const RecentActivity = ({ data, limit = 5 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Recent Activity
        </h3>
        <div className="text-center text-gray-400 py-8">No recent activity</div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PARTIAL":
        return "bg-orange-100 text-orange-800";
      case "UNPAID":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const displayData = data.slice(0, limit);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Recent Activity
      </h3>
      <div className="space-y-3">
        {displayData.map((activity, index) => (
          <div
            key={activity.id || index}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {activity.title}
              </p>
              <p className="text-sm text-gray-600 truncate">
                {activity.description}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(activity.timestamp), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
            {activity.status && (
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(activity.status)}`}
              >
                {activity.status}
              </span>
            )}
          </div>
        ))}
      </div>
      {data.length > limit && (
        <button className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all activity →
        </button>
      )}
    </div>
  );
};

export default RecentActivity;
