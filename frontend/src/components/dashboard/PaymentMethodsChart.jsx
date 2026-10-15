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
          ₹{payload[0].value.toLocaleString("en-IN")}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {payload[0].payload.count} transaction
          {payload[0].payload.count > 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  return null;
};

/**
 * PaymentMethodsChart Component
 * Displays payment method distribution using a donut chart with dual-theme readability
 */
const PaymentMethodsChart = ({ data, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-xs border border-slate-200/90 dark:border-dark-border p-4 sm:p-6 min-w-0 overflow-hidden">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
          Payment Methods
        </h3>
        <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
          No data available
        </div>
      </div>
    );
  }

  // Colors for different payment methods
  const methodColors = {
    CASH: "#10b981",
    UPI: "#3b82f6",
    CARD: "#8b5cf6",
    BANK_TRANSFER: "#f59e0b",
    MIXED: "#ec4899",
    CREDIT: "#ef4444",
  };

  const chartData = data.map((item) => ({
    name: item.method.replace("_", " "),
    value: item.amount,
    count: item.count,
    color: methodColors[item.method] || "#6b7280",
  }));

  const totalAmount = chartData.reduce((sum, item) => sum + item.value, 0);

  const renderLabel = (entry) => {
    const percent = ((entry.value / totalAmount) * 100).toFixed(0);
    return `${entry.name} (${percent}%)`;
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-xs border border-slate-200/90 dark:border-dark-border p-4 sm:p-6 min-w-0 overflow-hidden">
      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
        Payment Methods
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
            innerRadius={40}
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
    </div>
  );
};

export default PaymentMethodsChart;
