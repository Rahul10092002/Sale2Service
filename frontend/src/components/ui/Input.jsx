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
      inputClassName = "",
      ...props
    },
    ref
  ) => {
    return (
      <div className={clsx("w-full", className)}>
        {label && (
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
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
          data-error={Boolean(error)}
          aria-invalid={Boolean(error)}
          className={clsx(
            // MATCH SELECT FIELD EXACTLY
            "w-full h-9 sm:h-8 px-3 rounded-lg text-sm sm:text-xs font-medium",
            "border border-slate-300/90 dark:border-dark-border",
            "bg-white dark:bg-dark-input",
            "text-slate-900 dark:text-slate-50",
            "placeholder:text-slate-400 dark:placeholder:text-slate-400",

            // focus
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "dark:focus:border-primary-dark transition-colors",

            // states
            error && "border-danger focus:ring-danger/20 focus:border-danger",
            disabled &&
              "bg-slate-100 dark:bg-dark-subtle opacity-70 cursor-not-allowed",
            inputClassName
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