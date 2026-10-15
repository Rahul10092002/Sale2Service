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
    'bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow active:scale-[0.98] font-semibold',
  secondary:
    'bg-white dark:bg-dark-input text-slate-800 dark:text-slate-100 border border-slate-300/80 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover shadow-xs active:scale-[0.98] font-medium',
  danger:
    'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200/70 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/60 active:scale-[0.98] font-medium',
  ghost:
    'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-subtle hover:text-slate-900 dark:hover:text-white font-medium',
  success:
    'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 shadow-sm active:scale-[0.98] font-semibold',
  outline:
    'border border-primary text-primary dark:text-primary-dark dark:border-primary-dark/80 hover:bg-primary/5 dark:hover:bg-primary/15 focus:ring-primary/30 font-medium',
  gradient:
    'bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:opacity-95 shadow-sm active:scale-[0.98] font-semibold',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm sm:text-base gap-2',
  lg: 'px-5 py-2.5 text-base gap-2.5',
  xl: 'px-7 py-3.5 text-lg gap-3',
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
        'inline-flex items-center justify-center font-sans rounded-lg',
        'border-none cursor-pointer transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
        sizes[size],
        variants[variant],
        isDisabled && 'opacity-60 cursor-not-allowed shadow-none pointer-events-none active:scale-100',
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
