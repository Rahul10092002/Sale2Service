import React from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

/**
 * Alert — semantic alert banner with dark mode support.
 * Variants: success | error | warning | info
 */
const Alert = ({
  children,
  variant = "info",
  dismissible = false,
  onClose,
  className = "",
  title,
}) => {
  const variantClasses = {
    success:
      "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200",
    error:
      "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200",
    warning:
      "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200",
    info:
      "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200",
  };

  const iconComponents = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const IconComponent = iconComponents[variant] || Info;

  return (
    <div
      className={`px-4 py-3 rounded-xl border shadow-xs animate-fade-in ${variantClasses[variant] || variantClasses.info} ${className}`}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0 mt-0.5">
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="ml-3 flex-1 min-w-0">
          {title && <h3 className="text-sm font-bold tracking-tight mb-0.5">{title}</h3>}
          <div className="text-xs sm:text-sm font-medium leading-relaxed">{children}</div>
        </div>
        {dismissible && onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current transition-colors duration-150"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;
