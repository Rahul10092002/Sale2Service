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

  // UX: Add loading state from RTK Query
  const [triggerAutocomplete, { isLoading }] = useLazyProductAutocompleteQuery();

  // UX: Highlight matched text helper
  const highlight = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-100 px-0.5 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

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
        setShowDropdown(true); // Always show dropdown if we attempted a search
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
          "w-full h-8 px-3 rounded-lg text-xs " +
          "border border-gray-300 dark:border-dark-border " +
          "bg-white dark:bg-dark-input " +
          "text-ink-base dark:text-slate-100 " +
          "placeholder:text-ink-muted dark:placeholder:text-slate-500 " +
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary " +
          "transition-colors " +
          (error ? "border-danger focus:ring-danger/20 focus:border-danger" : "")
        }
      />

      {error && (
        <p className="mt-1 text-[11px] text-danger flex items-center">
          <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {showDropdown && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-md shadow-dropdown max-h-60 overflow-auto"
          onMouseDown={(e) => e.preventDefault()}
        >
          {isLoading && (
            <li className="px-3 py-2 text-[11px] text-gray-500 italic flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Searching...
            </li>
          )}

          {!isLoading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-[11px] text-gray-400">No results found</li>
          )}

          {suggestions.map((s, i) => (
            <li
              key={`${s.product_name}-${i}`}
              onClick={() => handleSelect(s)}
              className={
                "px-2 py-1.5 cursor-pointer flex items-start justify-between gap-2 text-xs " +
                (i === highlightedIndex
                  ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : "hover:bg-gray-50 dark:hover:bg-dark-hover text-gray-700 dark:text-slate-200")
              }
            >
              <div className="min-w-0">
                <p className="font-medium truncate text-xs">
                  {highlight(s.product_name, value)}
                </p>

                {(s.company || s.product_category) && (
                  <p className="text-[10px] text-gray-500 truncate dark:text-slate-500">
                    {[s.company, s.product_category].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex flex-col items-end gap-0.5">
                {s.selling_price > 0 && (
                  <span className="text-[10px] font-medium text-ink-secondary dark:text-slate-400">
                    ₹{s.selling_price.toLocaleString("en-IN")}
                  </span>
                )}

                <span
                  className={
                    "text-[9px] px-1.5 py-[2px] rounded-full font-medium " +
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
