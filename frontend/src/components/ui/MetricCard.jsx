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
    blue:   "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100/70 dark:border-blue-800/50",
    green:  "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100/70 dark:border-emerald-800/50",
    orange: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100/70 dark:border-amber-800/50",
    red:    "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100/70 dark:border-rose-800/50",
    purple: "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100/70 dark:border-purple-800/50",
    gray:   "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/50",
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    if (trend < 0) return <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
    return <Minus className="w-3.5 h-3.5 text-slate-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return "text-slate-500 dark:text-slate-400";
    return trend > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : trend < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-500 dark:text-slate-400";
  };

  return (
    <div
      className={`bg-white dark:bg-dark-card rounded-xl shadow-xs border border-slate-200/90 dark:border-dark-border p-3.5 sm:p-4 hover:shadow-md transition-all duration-200 ${onClick ? "cursor-pointer hover:-translate-y-0.5 active:translate-y-0" : ""} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2.5 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 truncate">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-0.5 truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
          )}
          {trend !== undefined && trend !== null && (
            <div className="flex items-center gap-1 mt-2.5">
              {getTrendIcon()}
              <span className={`text-xs font-semibold ${getTrendColor()}`}>
                {Math.abs(trend).toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">vs last period</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 sm:p-3 rounded-xl ${colorClasses[color] || colorClasses.blue} shadow-xs shrink-0`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
