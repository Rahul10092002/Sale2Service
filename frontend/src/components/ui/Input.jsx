import React, { forwardRef } from "react";
import clsx from "clsx";

const Input = forwardRef(
  (
    {
      type = "text",
      placeholder = "",
      value,
      onChange,
      error = "",
      label = "",
      required = false,
      disabled = false,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <div className={clsx("w-full", className)}>
        {label && (
          <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
            {label}
            {required && <span className="text-danger ml-1">*</span>}
          </label>
        )}

        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={clsx(
            // ✅ MATCH SELECT FIELD EXACTLY
            "w-full h-8 px-3 rounded-lg text-xs",
            "border border-gray-300 dark:border-dark-border",
            "bg-white dark:bg-dark-input",
            "text-ink-base dark:text-slate-100",
            "placeholder:text-ink-muted dark:placeholder:text-slate-500",

            // focus
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "dark:focus:border-primary-dark transition-colors",

            // states
            error && "border-danger focus:ring-danger/20 focus:border-danger",
            disabled &&
              "bg-surface-subtle dark:bg-dark-subtle opacity-70 cursor-not-allowed"
          )}
          {...props}
        />

        {error && (
          <p className="mt-1 text-[11px] text-danger flex items-center gap-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export default Input;