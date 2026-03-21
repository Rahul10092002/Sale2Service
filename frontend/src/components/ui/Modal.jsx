import { useEffect, useRef } from "react";
import { X } from "lucide-react";

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
    "5xl": "max-w-5xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogRef}
        className={`bg-white border border-gray-200 rounded-xl shadow-lg animate-slide-in w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-hidden flex flex-col ${className}`}
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
    className={`px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl flex items-center justify-between ${className}`}
  >
    <div className="flex items-center space-x-3">
      {icon && (
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">{icon}</div>
      )}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{children}</h2>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>
    </div>
    {onClose && (
      <button
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 inline-flex items-center justify-center border-transparent"
        aria-label="Close dialog"
      >
        <X className="w-5 h-5" />
      </button>
    )}
  </div>
);

const DialogBody = ({ children, className = "" }) => (
  <div
    className={`px-6 py-4 custom-scrollbar overflow-y-auto flex-1 ${className}`}
  >
    {children}
  </div>
);

const DialogFooter = ({ children, className = "" }) => (
  <div
    className={`px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end space-x-2 ${className}`}
  >
    {children}
  </div>
);

export { Dialog, DialogHeader, DialogBody, DialogFooter };
