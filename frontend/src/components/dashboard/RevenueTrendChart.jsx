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
 * Custom Tooltip Component
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-sm text-blue-600 font-semibold">
          ₹{payload[0].value.toLocaleString("en-IN")}
        </p>
        {payload[0].payload.count && (
          <p className="text-xs text-gray-500">
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
 * Displays revenue trend over time using a line chart
 */
const RevenueTrendChart = ({ data, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Revenue Trend
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  // Format data for the chart
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: format(parseISO(item.date), "MMM dd"),
    revenue: Number(item.revenue || 0),
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Revenue Trend
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="displayDate"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", r: 4 }}
            activeDot={{ r: 6 }}
            name="Revenue"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueTrendChart;
