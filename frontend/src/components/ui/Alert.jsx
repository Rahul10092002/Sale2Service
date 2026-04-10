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
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300",
    error:
      "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300",
    warning:
      "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300",
    info:
      "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300",
  };

  const iconComponents = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const IconComponent = iconComponents[variant];

  return (
    <div
      className={`px-4 py-3 rounded-lg border animate-fade-in ${variantClasses[variant]} ${className}`}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="ml-3 flex-1">
          {title && <h3 className="text-sm font-medium mb-1">{title}</h3>}
          <div className="text-sm">{children}</div>
        </div>
        {dismissible && onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex rounded-md p-1.5 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current transition-colors duration-200"
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
