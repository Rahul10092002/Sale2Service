import React from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

/**
 * WarrantyDesk Alert component for displaying messages
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Alert content
 * @param {string} props.variant - Alert variant (success, error, warning, info)
 * @param {boolean} props.dismissible - Whether alert can be dismissed
 * @param {function} props.onClose - Close handler
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.title - Optional alert title
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
      "px-4 py-3 rounded-lg border bg-green-50 border-green-200 text-green-800",
    error: "px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-800",
    warning:
      "px-4 py-3 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "px-4 py-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-800",
  };

  const iconComponents = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const IconComponent = iconComponents[variant];

  return (
    <div className={`${variantClasses[variant]} animate-fade-in ${className}`}>
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
                className="inline-flex rounded-md p-1.5 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current transition-colors duration-200"
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
