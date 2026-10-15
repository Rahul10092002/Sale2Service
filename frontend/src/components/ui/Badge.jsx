import React from 'react';
import clsx from 'clsx';

/**
 * WarrantyDesk Badge — Tailwind v4 design system
 *
 * Variants: blue | green | red | purple | gray | amber
 */
const badgeVariants = {
  blue:   'bg-blue-50 text-blue-700 border border-blue-200/70 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/50',
  green:  'bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50',
  red:    'bg-red-50 text-red-700 border border-red-200/70 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/50',
  purple: 'bg-purple-50 text-purple-700 border border-purple-200/70 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/50',
  amber:  'bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50',
  gray:   'bg-slate-100 text-slate-700 border border-slate-200/70 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700/60',
};

export function Badge({ variant = 'gray', className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs font-semibold whitespace-nowrap tracking-tight transition-colors',
        badgeVariants[variant] || badgeVariants.gray,
        className,
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
