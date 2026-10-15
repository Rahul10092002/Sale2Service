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
    xs:   "max-w-xs",
    sm:   "max-w-sm",
    md:   "max-w-md",
    lg:   "max-w-lg",
    xl:   "max-w-xl",
    "2xl":"max-w-2xl",
    "3xl":"max-w-3xl",
    "4xl":"max-w-4xl",
    "5xl":"max-w-5xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        ref={dialogRef}
        className={`bg-white dark:bg-dark-card border border-slate-200/90 dark:border-dark-border rounded-2xl shadow-modal animate-slide-in w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-hidden flex flex-col ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

const DialogHeader = ({
  children,
  title,
  icon,
  subtitle,
  onClose,
  className = "",
}) => {
  const headingContent = title ?? children;

  return (
    <div
      className={`px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-dark-border bg-slate-50/80 dark:bg-dark-input rounded-t-2xl flex items-center justify-between ${className}`}
    >
      <div className="flex items-center space-x-3">
        {icon && (
          <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
            {icon}
          </div>
        )}
        <div>
          {typeof headingContent === "string" ? (
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {headingContent}
            </h2>
          ) : (
            <div className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {headingContent}
            </div>
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-hover rounded-lg transition-all duration-150 inline-flex items-center justify-center border-transparent"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

const DialogBody = ({ children, className = "" }) => (
  <div
    className={`px-5 sm:px-6 py-4 custom-scrollbar overflow-y-auto flex-1 bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 ${className}`}
  >
    {children}
  </div>
);

const DialogFooter = ({ children, className = "" }) => (
  <div
    className={`px-5 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-dark-border bg-slate-50/80 dark:bg-dark-input rounded-b-2xl flex justify-end space-x-2.5 ${className}`}
  >
    {children}
  </div>
);

export { Dialog, DialogHeader, DialogBody, DialogFooter };
