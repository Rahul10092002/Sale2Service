import { useEffect, useRef } from "react";

const Dialog = ({
  open,
  onClose,
  children,
  maxWidth = "2xl",
  className = "",
  closeOnClickOutside = true,
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        closeOnClickOutside &&
        open &&
        dialogRef.current &&
        !dialogRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      // Use capture phase to ensure we catch the event before anything else
      document.addEventListener("mousedown", handleClickOutside, true);
      document.addEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    };
  }, [open, onClose, closeOnClickOutside]);

  if (!open) return null;

  const maxWidthClasses = {
    xs: "max-w-xs",
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-opacity-30 backdrop-blur-md bg-opacity-40">
      <div
        ref={dialogRef}
        className={`bg-white rounded-xl shadow-2xl w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-hidden flex flex-col ${className}`}
        // Prevent clicks inside dialog from bubbling up
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

const DialogHeader = ({
  children,
  icon,
  subtitle,
  onClose,
  className = "",
}) => (
  <div
    className={`flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 ${className}`}
  >
    <div className="flex items-center space-x-3">
      {icon && <div className="p-2 bg-blue-100 rounded-lg">{icon}</div>}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{children}</h2>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>
    </div>
    {onClose && (
      <button
        onClick={onClose}
        className="p-2 text-red-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        Close
      </button>
    )}
  </div>
);

const DialogBody = ({ children, className = "" }) => (
  <div className={`p-6 overflow-y-auto max-h-[calc(90vh-140px)] ${className}`}>
    {children}
  </div>
);

const DialogFooter = ({ children, className = "" }) => (
  <div
    className={`flex justify-end pt-6 border-t border-gray-200 ${className}`}
  >
    {children}
  </div>
);

export { Dialog, DialogHeader, DialogBody, DialogFooter };
