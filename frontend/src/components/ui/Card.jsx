import React from 'react';
import clsx from 'clsx';

const Card = ({ className = '', children, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-dark-card text-ink-base dark:text-slate-100',
        'border border-gray-200/90 dark:border-dark-border rounded-xl shadow-xs',
        'transition-colors duration-200 flex flex-col gap-4 p-4 sm:p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { Card };
export default Card;
