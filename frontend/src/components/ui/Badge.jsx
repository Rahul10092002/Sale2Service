import React from 'react';
import clsx from 'clsx';

/**
 * WarrantyDesk Badge — Tailwind v4 design system
 *
 * Variants: blue | green | red | purple | gray
 */

const badgeVariants = {
  blue:   'bg-primary/10 text-primary dark:bg-primary-dark/15 dark:text-primary-dark',
  green:  'bg-success/10 text-success dark:bg-success-dark/15 dark:text-success-dark',
  red:    'bg-danger/10 text-danger dark:bg-danger-dark/15 dark:text-danger-dark',
  purple: 'bg-purple-gst/10 text-purple-gst dark:bg-purple-gst-dark/15 dark:text-purple-gst-dark',
  gray:   'bg-gray-100 text-ink-secondary dark:bg-dark-subtle dark:text-slate-400',
};

export function Badge({ variant = 'gray', className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs font-semibold whitespace-nowrap',
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
