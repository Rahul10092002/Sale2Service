import React, { forwardRef } from 'react';
import clsx from 'clsx';

/**
 * WarrantyDesk Input — Tailwind v4 design system
 *
 * Supports: label, error, disabled, required, forwardRef
 * All styling via design token classes (no inline styles).
 */
const Input = forwardRef(
  (
    {
      type = 'text',
      placeholder = '',
      value,
      onChange,
      error = '',
      label = '',
      required = false,
      disabled = false,
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <div className={clsx('mb-4', className)}>
        {label && (
          <label className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-1.5">
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
            'w-full px-3.5 py-2.5 rounded text-base font-sans',
            'border border-gray-200 dark:border-dark-border',
            'bg-white dark:bg-dark-input',
            'text-ink-base dark:text-slate-100',
            'placeholder:text-ink-muted dark:placeholder:text-slate-500',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'dark:focus:ring-primary-dark/20 transition-all duration-200',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            disabled && 'bg-surface-subtle dark:bg-dark-subtle opacity-70 cursor-not-allowed',
          )}
          {...props}
        />

        {error && (
          <p className="mt-1.5 text-sm text-danger flex items-center gap-1">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
  },
);

Input.displayName = 'Input';

export { Input };
export default Input;
