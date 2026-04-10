import React, { useRef, useState, useCallback, useEffect } from "react";
import { useLazyProductAutocompleteQuery } from "../../features/products/productApi.js";

/**
 * Autocomplete input for product names.
 * Searches InvoiceItem history and ProductMaster on the server.
 *
 * Props:
 *   value        – controlled text value
 *   onChange(text) – called on every keystroke
 *   onSelect(suggestion) – called when user picks a suggestion; suggestion has:
 *                  product_name, product_category, company, model_number,
 *                  selling_price, capacity_rating, voltage, count, source
 *   error        – validation error string
 *   placeholder  – input placeholder
 */
export default function ProductNameAutocomplete({
  value,
  onChange,
  onSelect,
  error,
  placeholder = "Product name",
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef(null);
  // Prevents in-flight fetches from re-opening the dropdown after a selection
  const selectionGuard = useRef(false);
  // Keep a ref to latest suggestions so the blur handler reads current data
  const suggestionsRef = useRef([]);

  const [triggerAutocomplete] = useLazyProductAutocompleteQuery();

  const fetchSuggestions = useCallback(
    async (query) => {
      if (!query || query.trim().length < 1) {
        setSuggestions([]);
        suggestionsRef.current = [];
        setShowDropdown(false);
        return;
      }
      try {
        const result = await triggerAutocomplete({
          q: query.trim(),
          limit: 10,
        });
        // Don't show suggestions if the user already picked one
        if (selectionGuard.current) return;
        const suggs = result.data?.suggestions ?? [];
        setSuggestions(suggs);
        suggestionsRef.current = suggs;
        setShowDropdown(suggs.length > 0);
      } catch {
        setSuggestions([]);
        suggestionsRef.current = [];
        setShowDropdown(false);
      }
    },
    [triggerAutocomplete],
  );

  const handleChange = (e) => {
    const text = e.target.value;
    onChange(text);
    setHighlightedIndex(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 350);
  };

  const handleSelect = (suggestion) => {
    // Block any pending debounce or in-flight fetch from re-opening the dropdown
    selectionGuard.current = true;
    clearTimeout(debounceRef.current);
    setTimeout(() => {
      selectionGuard.current = false;
    }, 600);

    onSelect(suggestion);
    setSuggestions([]);
    suggestionsRef.current = [];
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowDropdown(false);
    }, 180);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);
  return (
    <div className="relative">
      <input
        type="text"
        value={value ?? ""}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={
          "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors placeholder-gray-400 dark:bg-dark-card dark:border-dark-border dark:text-slate-100 " +
          (error
            ? "border-red-500 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-dark-card dark:border-dark-border dark:text-slate-100"
            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-card dark:border-dark-border dark:text-slate-100")
        }
      />

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {showDropdown && suggestions.length > 0 && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 bg-white dark: bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg shadow-lg max-h-64 overflow-y-auto"
          onMouseDown={(e) => e.preventDefault()}
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.product_name}-${i}`}
              onClick={() => handleSelect(s)}
              className={
                "px-3 py-2 cursor-pointer flex items-start justify-between gap-2 dark:bg-dark-bg dark:border-dark-border dark:text-slate-100 " +
                (i === highlightedIndex
                  ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-slate-100")
              }
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.product_name}</p>
                {(s.company || s.product_category) && (
                  <p className="text-xs text-gray-500 truncate dark:text-slate-500">
                    {[s.company, s.product_category]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-0.5">
                {s.selling_price > 0 && (
                  <span className="text-xs font-medium text-ink-secondary dark:text-slate-400">
                    ₹{s.selling_price.toLocaleString("en-IN")}
                  </span>
                )}
                <span
                  className={
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium dark:bg-dark-bg dark:border-dark-border dark:text-slate-100 " +
                    (s.source === "history"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400")
                  }
                >
                  {s.source === "history" ? `×${s.count}` : "saved"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
