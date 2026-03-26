import React, { useState } from "react";
import {
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../utils/constants.js";

/**
 * AlertsPanel Component
 * Displays important alerts and notifications
 */
const AlertsPanel = ({ alerts }) => {
  const navigate = useNavigate();
  const [expandedIndex, setExpandedIndex] = useState(null);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return null;
    const now = new Date();
    const diff = Math.floor((now - new Date(dueDate)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  };

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
      case "service":
        return Wrench;
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
          const hasItems = alert.items?.length > 0;
          const isExpanded = expandedIndex === index;

          return (
            <div
              key={index}
              className={`rounded-lg border ${styles.container}`}
            >
              {/* Header row */}
              <div className="flex items-start gap-3 p-4" onClick={() => {
                if(hasItems) {
                  setExpandedIndex(isExpanded ? null : index);
                }

              }}>
                <Icon className={`w-5 h-5 ${styles.icon} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${styles.text} wrap-break-word`}
                  >
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
                <div className="flex items-center gap-2 shrink-0">
                  {alert.count && (
                    <span
                      className={`px-2 py-1 text-xs font-bold rounded ${styles.icon} bg-white`}
                    >
                      {alert.count}
                    </span>
                  )}
                  {hasItems && (
                    <button
                      onClick={() =>
                        setExpandedIndex(isExpanded ? null : index)
                      }
                      className={`p-1 rounded hover:bg-white/60 transition-colors ${styles.icon}`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable items */}
              {hasItems && isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {alert.items.map((item, i) => {
                    const isServiceItem = alert.category === "service";
                    const daysOverdue = getDaysOverdue(
                      isServiceItem ? item.scheduled_date : item.due_date,
                    );
                    return isServiceItem ? (
                      // Service schedule item
                      <div
                        key={i}
                        onClick={() =>
                          item.product_id &&
                          navigate(`${ROUTES.PRODUCTS}/${item.product_id}`)
                        }
                        className={`bg-white rounded-lg border border-red-100 p-3 ${
                          item.id
                            ? "cursor-pointer hover:border-red-300 hover:shadow-sm"
                            : ""
                        } transition-all`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 capitalize">
                              {item.customer_name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {item.product_name}
                            </p>
                            {item.invoice_number && (
                              <p className="text-xs font-mono text-gray-400">
                                {item.invoice_number}
                              </p>
                            )}
                            {item.phone && (
                              <p className="text-xs text-gray-400">
                                {item.phone}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-500">
                              Service #{item.service_number}
                            </p>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                item.status === "MISSED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <p className="text-xs text-gray-400">
                            Scheduled: {formatDate(item.scheduled_date)}
                          </p>
                          {daysOverdue && (
                            <span className="text-xs font-medium text-red-600">
                              ({daysOverdue}d overdue)
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Payment overdue item
                      <div
                        key={item.id}
                        onClick={() =>
                          navigate(`${ROUTES.INVOICES}/${item.id}`)
                        }
                        className="bg-white rounded-lg border border-orange-100 p-3 cursor-pointer hover:border-orange-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate capitalize">
                              {item.customer_name}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {item.invoice_number}
                            </p>
                            {item.phone && (
                              <p className="text-xs text-gray-400">
                                {item.phone}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-gray-800">
                              {formatCurrency(item.total_amount)}
                            </p>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                item.payment_status === "UNPAID"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {item.payment_status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <p className="text-xs text-gray-400">
                            Due: {formatDate(item.due_date)}
                          </p>
                          {daysOverdue && (
                            <span className="text-xs font-medium text-red-600">
                              ({daysOverdue}d overdue)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsPanel;
