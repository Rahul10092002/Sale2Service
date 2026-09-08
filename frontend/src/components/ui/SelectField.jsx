import React, { useState, useRef, useEffect } from "react";

function SelectField({
  id,
  name,
  label,
  value,
  onChange,
  options = [],
  required = false,
  placeholder = "Select",
  error = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [isOpen]);

  const selected = options.find((opt) => opt.value === value);
  const fieldName = name || id;

  const handleSelect = (selectedValue) => {
    if (onChange)
      onChange({ target: { name: fieldName, value: selectedValue } });
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((s) => !s)}
        data-error={Boolean(error)}
        aria-invalid={Boolean(error)}
        className={`w-full h-9 sm:h-8 px-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 flex items-center justify-between hover:border-gray-400 dark:hover:border-slate-500 text-sm sm:text-xs ${
          error
            ? "border-danger focus:ring-danger/20 focus:border-danger"
            : "border-gray-300 dark:border-dark-border focus:ring-primary/20 focus:border-primary dark:focus:border-primary-dark"
        } ${isOpen ? "ring-2 ring-primary/20 border-primary" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        id={id}
      >
        <span className={`truncate text-sm sm:text-xs ${value ? "text-ink-base dark:text-slate-100" : "text-ink-muted dark:text-slate-500"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 ml-2 text-ink-muted dark:text-slate-500 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {error && (
        <p className="mt-1 text-[11px] text-danger flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {isOpen && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 mt-1 z-50 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-dropdown max-h-60 overflow-auto"
        >
          {options && options.length > 0 ? (
            options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`px-3 py-2 sm:py-1.5 cursor-pointer text-sm sm:text-xs border-b border-gray-100 dark:border-dark-border last:border-b-0 transition-colors text-ink-base dark:text-slate-200 min-h-[38px] sm:min-h-0 flex items-center ${
                  opt.value === value
                    ? "bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-primary-dark font-medium"
                    : "hover:bg-surface-hover dark:hover:bg-dark-hover"
                }`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-ink-muted dark:text-slate-500 text-sm sm:text-xs">No options</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default SelectField;
