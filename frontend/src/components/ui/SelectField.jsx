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
      // Ignore clicks on inputs/textareas to avoid interrupting typing
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    // Use pointerdown which is less likely to interfere with focus
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [isOpen]);

  const selected = options.find((opt) => opt.value === value);

  const fieldName = name || id;

  const handleSelect = (selectedValue) => {
    // Call onChange with a synthetic event shape for compatibility
    if (onChange)
      onChange({ target: { name: fieldName, value: selectedValue } });
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((s) => !s)}
        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white flex items-center justify-between hover:border-gray-400 text-sm ${isOpen ? "ring-2 ring-blue-100" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        id={id}
      >
        <span
          className={`truncate text-sm ${value ? "text-gray-900" : "text-gray-500"}`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 ml-2 text-gray-400 transition-transform shrink-0 ${isOpen ? "transform rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {options && options.length > 0 ? (
            options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors ${opt.value === value ? "bg-blue-50" : ""}`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-gray-500 text-sm">No options</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default SelectField;
