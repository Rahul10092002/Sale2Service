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
          {payload[0].value} invoice{payload[0].value > 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  return null;
};

/**
 * InvoiceStatusChart Component
 * Displays invoice distribution by payment status using a pie chart
 */
const InvoiceStatusChart = ({ data, height = 300 }) => {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Invoice Status
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
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
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Invoice Status
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
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
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
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
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-500">Paid</p>
          <p className="text-sm font-semibold text-green-600">
            {data.paid?.count || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Partial</p>
          <p className="text-sm font-semibold text-orange-600">
            {data.partial?.count || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Unpaid</p>
          <p className="text-sm font-semibold text-red-600">
            {data.unpaid?.count || 0}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceStatusChart;
