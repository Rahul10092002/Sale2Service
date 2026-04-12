import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * MetricCard — stat card with icon, trend indicator, and dark mode support.
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
    blue:   "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    green:  "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    orange: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    red:    "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    purple: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    gray:   "bg-gray-50 dark:bg-dark-subtle text-gray-600 dark:text-slate-400",
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return "text-ink-muted dark:text-slate-500";
    return trend > 0
      ? "text-green-600 dark:text-green-400"
      : trend < 0
        ? "text-red-600 dark:text-red-400"
        : "text-ink-muted dark:text-slate-500";
  };

  return (
    <div
      className={`bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-3 hover:shadow-md transition-all duration-200 ${onClick ? "cursor-pointer hover:-translate-y-1" : ""} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-medium text-ink-secondary dark:text-slate-400 mb-0.5 truncate">
            {title}
          </p>
          <p className="text-lg sm:text-xl font-bold text-ink-base dark:text-slate-100 mb-0.5 truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-ink-muted dark:text-slate-500 truncate">{subtitle}</p>
          )}
          {trend !== undefined && trend !== null && (
            <div className="flex items-center gap-1 mt-3">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {Math.abs(trend).toFixed(1)}%
              </span>
              <span className="text-xs text-ink-muted dark:text-slate-500">vs last period</span>
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
