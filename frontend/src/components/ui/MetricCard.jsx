import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * WarrantyDesk MetricCard Component
 * Displays a key metric with optional trend indicator
 */
const MetricCard = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  color = "blue",
  onClick,
  className = "",
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
    gray: "bg-gray-50 text-gray-600",
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    if (trend > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (trend < 0) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return "text-gray-500";
    return trend > 0
      ? "text-green-600"
      : trend < 0
        ? "text-red-600"
        : "text-gray-500";
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 ${onClick ? "cursor-pointer hover:-translate-y-1" : ""} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 mb-1 truncate">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 truncate">{subtitle}</p>
          )}
          {trend !== undefined && trend !== null && (
            <div className="flex items-center gap-1 mt-3">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {Math.abs(trend).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500">vs last period</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]} shadow-sm`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
