import React from "react";
import { AlertTriangle, Info, AlertCircle, CheckCircle } from "lucide-react";

/**
 * AlertsPanel Component
 * Displays important alerts and notifications
 */
const AlertsPanel = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Alerts & Notifications
        </h3>
        <div className="flex items-center gap-2 text-green-600 p-4 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">
            All caught up! No urgent items.
          </span>
        </div>
      </div>
    );
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case "warning":
        return AlertTriangle;
      case "error":
        return AlertCircle;
      case "info":
        return Info;
      default:
        return Info;
    }
  };

  const getAlertStyles = (type) => {
    switch (type) {
      case "warning":
        return {
          container: "bg-orange-50 border-orange-200",
          icon: "text-orange-600",
          text: "text-orange-800",
        };
      case "error":
        return {
          container: "bg-red-50 border-red-200",
          icon: "text-red-600",
          text: "text-red-800",
        };
      case "info":
        return {
          container: "bg-blue-50 border-blue-200",
          icon: "text-blue-600",
          text: "text-blue-800",
        };
      default:
        return {
          container: "bg-gray-50 border-gray-200",
          icon: "text-gray-600",
          text: "text-gray-800",
        };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Alerts & Notifications
      </h3>
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = getAlertIcon(alert.type);
          const styles = getAlertStyles(alert.type);

          return (
            <div
              key={index}
              className={`flex items-start gap-3 p-4 rounded-lg border ${styles.container}`}
            >
              <Icon className={`w-5 h-5 ${styles.icon} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${styles.text} break-words`}>
                  {alert.message}
                </p>
                {alert.action && (
                  <button
                    className={`text-sm font-medium mt-2 ${styles.text} hover:underline`}
                  >
                    {alert.action}
                  </button>
                )}
              </div>
              {alert.count && (
                <span
                  className={`px-2 py-1 text-xs font-bold rounded ${styles.icon} bg-white`}
                >
                  {alert.count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsPanel;
