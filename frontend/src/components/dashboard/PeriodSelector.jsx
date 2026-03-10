import React from "react";

/**
 * PeriodSelector Component
 * Allows users to select time period for dashboard data
 */
const PeriodSelector = ({ value, onChange }) => {
  const periods = [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ];

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            value === period.value
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
};

export default PeriodSelector;
