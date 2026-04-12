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
    <div className="inline-flex rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-input p-0.5 shadow-sm">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            value === period.value
              ? "bg-primary text-white dark:bg-primary-dark shadow-sm"
              : "text-ink-secondary dark:text-slate-400 hover:bg-surface-hover dark:hover:bg-dark-hover"
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
};

export default PeriodSelector;
