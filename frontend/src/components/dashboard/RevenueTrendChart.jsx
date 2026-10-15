import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

/**
 * Custom Tooltip Component with dark mode support
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-dark-card p-3 rounded-xl shadow-lg border border-slate-200 dark:border-dark-border">
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
          ₹{payload[0].value.toLocaleString("en-IN")}
        </p>
        {payload[0].payload.count && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {payload[0].payload.count} invoice
            {payload[0].payload.count > 1 ? "s" : ""}
          </p>
        )}
      </div>
    );
  }
  return null;
};

/**
 * RevenueTrendChart Component
 * Displays revenue trend over time using a line chart with dual-theme readability
 */
const RevenueTrendChart = ({ data, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-xs border border-slate-200/90 dark:border-dark-border p-4 sm:p-6 min-w-0 overflow-hidden">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
          Revenue Trend
        </h3>
        <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
          No data available
        </div>
      </div>
    );
  }

  // Format data for the chart
  const formattedData = data?.data?.map((item) => ({
    ...item,
    displayDate: format(parseISO(item.date), "MMM dd"),
    revenue: Number(item.revenue || 0),
  }));

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-xs border border-slate-200/90 dark:border-dark-border p-4 sm:p-6">
      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
        Revenue Trend
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
          <XAxis
            dataKey="displayDate"
            stroke="#94a3b8"
            style={{ fontSize: "11px" }}
            tick={{ fill: "currentColor", className: "text-slate-600 dark:text-slate-400 text-[11px]" }}
          />
          <YAxis
            stroke="#94a3b8"
            style={{ fontSize: "11px" }}
            tick={{ fill: "currentColor", className: "text-slate-600 dark:text-slate-400 text-[11px]" }}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ fill: "#3b82f6", r: 3.5 }}
            activeDot={{ r: 5 }}
            name="Revenue"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueTrendChart;
