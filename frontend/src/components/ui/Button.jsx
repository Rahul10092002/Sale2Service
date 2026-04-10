import React from 'react';
import clsx from 'clsx';

/**
 * WarrantyDesk Button — Tailwind v4 design system
 *
 * Variants: primary | secondary | danger | ghost | success | outline | gradient
 * Sizes:    xs | sm | md | lg | xl
 */

const variants = {
  primary:
    'bg-primary text-white shadow-card hover:bg-primary-hover hover:shadow-card-hover hover:-translate-y-px active:translate-y-0',
  secondary:
    'bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 border border-gray-200 dark:border-dark-border hover:bg-surface-hover dark:hover:bg-dark-hover',
  danger:
    'bg-danger/10 text-danger hover:bg-danger/20',
  ghost:
    'bg-transparent text-ink-secondary hover:bg-gray-100 dark:hover:bg-dark-subtle',
  success:
    'bg-success text-white hover:opacity-90',
  outline:
    'border-2 border-primary text-primary hover:bg-primary-light focus:ring-primary/30',
  gradient:
    'bg-gradient-to-r from-primary to-success text-white hover:opacity-90 shadow-card hover:shadow-card-hover',
};

const sizes = {
  xs: 'px-2 py-1 text-xs gap-1',
  sm: 'px-3 py-2 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-base gap-2',
  lg: 'px-6 py-3 text-lg gap-2.5',
  xl: 'px-8 py-4 text-xl gap-3',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  onClick,
  type = 'button',
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-sans font-medium rounded',
        'border-none cursor-pointer transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        sizes[size],
        variants[variant],
        isDisabled && 'opacity-60 cursor-not-allowed translate-y-0 shadow-none pointer-events-none',
        className,
      )}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin-slow -ml-1 h-4 w-4 text-current shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

export default Button;
