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
 * Custom Tooltip Component
 */
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-900">{payload[0].name}</p>
        <p
          className="text-sm font-semibold"
          style={{ color: payload[0].payload.color }}
        >
          ₹{payload[0].value.toLocaleString("en-IN")}
        </p>
        <p className="text-xs text-gray-500">
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
 * Displays payment method distribution using a donut chart
 */
const PaymentMethodsChart = ({ data, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 min-w-0 overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Payment Methods
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
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
    <div className="bg-white rounded-lg shadow p-6 min-w-0 overflow-hidden">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
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
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PaymentMethodsChart;
