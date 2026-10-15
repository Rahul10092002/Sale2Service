import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/**
 * Custom Tooltip Component with dark mode support
 */
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-dark-card p-3 rounded-xl shadow-lg border border-slate-200 dark:border-dark-border">
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          {payload[0].payload.name}
        </p>
        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
          ₹{payload[0].value.toLocaleString("en-IN")}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Qty: {payload[0].payload.quantity}
        </p>
      </div>
    );
  }
  return null;
};

/**
 * TopProductsChart Component
 * Displays top products by revenue using a bar chart with dual-theme readability
 */
const TopProductsChart = ({ data, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-xs border border-slate-200/90 dark:border-dark-border p-4 sm:p-6 min-w-0 overflow-hidden">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
          Top Products
        </h3>
        <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
          No data available
        </div>
      </div>
    );
  }

  // Colors for bars
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-xs border border-slate-200/90 dark:border-dark-border p-4 sm:p-6">
      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
        Top Products (Last 30 Days)
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
          <XAxis
            type="number"
            stroke="#94a3b8"
            style={{ fontSize: "11px" }}
            tick={{ fill: "currentColor", className: "text-slate-600 dark:text-slate-400 text-[11px]" }}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#94a3b8"
            style={{ fontSize: "11px" }}
            width={65}
            tick={{ fill: "currentColor", className: "text-slate-600 dark:text-slate-400 text-[11px]", textAnchor: "end" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopProductsChart;
