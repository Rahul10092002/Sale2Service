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
    <div ref={ref} className="relative">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-ink-secondary dark:text-slate-300 mb-2"
      >
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((s) => !s)}
        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 flex items-center justify-between hover:border-gray-400 dark:hover:border-slate-500 text-sm border-gray-300 dark:border-dark-border focus:ring-primary/20 focus:border-primary dark:focus:border-primary-dark ${isOpen ? "ring-2 ring-primary/20 border-primary" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        id={id}
      >
        <span className={`truncate text-sm ${value ? "text-ink-base dark:text-slate-100" : "text-ink-muted dark:text-slate-500"}`}>
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

      {isOpen && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 mt-1 z-50 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-md shadow-dropdown max-h-60 overflow-auto"
        >
          {options && options.length > 0 ? (
            options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`px-3 py-2 cursor-pointer text-sm border-b border-gray-100 dark:border-dark-border last:border-b-0 transition-colors text-ink-base dark:text-slate-200 ${
                  opt.value === value
                    ? "bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-primary-dark"
                    : "hover:bg-surface-hover dark:hover:bg-dark-hover"
                }`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-ink-muted dark:text-slate-500 text-sm">No options</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default SelectField;
