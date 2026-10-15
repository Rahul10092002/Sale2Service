import React from "react";

/**
 * PeriodSelector — tab-style time period switcher with dark mode support.
 */
const PeriodSelector = ({ value, onChange }) => {
  const periods = [
    { value: "today", label: "Today" },
    { value: "week",  label: "This Week" },
    { value: "month", label: "This Month" },
  ];

  return (
    <div className="inline-flex rounded-lg border border-slate-200/90 dark:border-dark-border bg-white dark:bg-dark-input p-0.5 shadow-xs">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
            value === period.value
              ? "bg-primary text-white dark:bg-blue-600 shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover"
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
};

export default PeriodSelector;
