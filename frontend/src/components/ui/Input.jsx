import React, { forwardRef } from "react";

/**
 * Reusable Input component with Tailwind styling
 * @param {Object} props - Component props
 * @param {string} props.type - Input type
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.value - Input value
 * @param {function} props.onChange - Change handler
 * @param {string} props.error - Error message
 * @param {string} props.label - Label text
 * @param {boolean} props.required - Whether field is required
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {string} props.className - Additional CSS classes
 */
const Input = forwardRef(
  (
    {
      type = "text",
      placeholder = "",
      value = "",
      onChange,
      error = "",
      label = "",
      required = false,
      disabled = false,
      className = "",
      ...props
    },
    ref,
  ) => {
    return (
      <div className={`mb-4 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={
            `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${className}` +
            (error
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : "border-gray-300 focus:ring-blue-500 focus:border-blue-500") +
            (disabled ? " bg-gray-100 cursor-not-allowed" : " bg-white") +
            " placeholder-gray-400"
          }
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
