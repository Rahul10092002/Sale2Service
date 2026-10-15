import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

/**
 * Custom Tooltip Component with dark mode support
 */
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-dark-card p-3 rounded-xl shadow-lg border border-slate-200 dark:border-dark-border">
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{payload[0].name}</p>
        <p
          className="text-sm font-bold mt-0.5"
          style={{ color: payload[0].payload.color }}
        >
          {payload[0].value} invoice{payload[0].value > 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  return null;
};

/**
 * InvoiceStatusChart Component
 * Displays invoice distribution by payment status using a pie chart with dual-theme readability
 */
const InvoiceStatusChart = ({ data, height = 300 }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-xs border border-slate-200/90 dark:border-dark-border p-4 sm:p-6 min-w-0 overflow-hidden">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
          Invoice Status
        </h3>
        <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
          No data available
        </div>
      </div>
    );
  }

  // Format data for pie chart
  const chartData = [
    { name: "Paid", value: data.paid?.count || 0, color: "#10b981" },
    { name: "Partial", value: data.partial?.count || 0, color: "#f59e0b" },
    { name: "Unpaid", value: data.unpaid?.count || 0, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-xs border border-slate-200/90 dark:border-dark-border p-4 sm:p-6 min-w-0 overflow-hidden">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
          Invoice Status
        </h3>
        <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
          No invoices yet
        </div>
      </div>
    );
  }

  const renderLabel = (entry) => {
    const percent = ((entry.value / data.total) * 100).toFixed(0);
    return `${entry.name} (${percent}%)`;
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-xs border border-slate-200/90 dark:border-dark-border p-4 sm:p-6 min-w-0 overflow-hidden">
      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
        Invoice Status
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-100 dark:border-dark-border/60">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Paid</p>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {data.paid?.count || 0}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Partial</p>
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
            {data.partial?.count || 0}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unpaid</p>
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
            {data.unpaid?.count || 0}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceStatusChart;
