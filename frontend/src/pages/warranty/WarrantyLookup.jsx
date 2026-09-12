import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  ShieldCheck,
  Building2,
  User,
  Phone,
  Calendar,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileText,
  History,
  Package,
  X,
  Sparkles,
  Edit3,
} from "lucide-react";
import {
  useLazyLookupWarrantyQuery,
  useGetWarrantySuggestionsQuery,
} from "../../features/warranty/warrantyApi.js";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
import { formatDate } from "../../utils/date.js";
import RetroactiveDealerModal from "../inventory/RetroactiveDealerModal.jsx";

const WarrantyLookup = () => {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedRetroItem, setSelectedRetroItem] = useState(null);
  const searchContainerRef = useRef(null);

  const [triggerLookup, { data, isLoading, isError, error }] =
    useLazyLookupWarrantyQuery();

  const { data: suggestionsData, isFetching: isSuggestionsLoading } =
    useGetWarrantySuggestionsQuery(query, {
      skip: false,
    });

  const suggestions = suggestionsData?.suggestions || [];

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) {
      triggerLookup(query.trim());
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setQuery(suggestion.value);
    setShowSuggestions(false);
    triggerLookup(suggestion.value);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case "serial":
        return <Tag className="w-4 h-4 text-blue-500" />;
      case "invoice":
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case "customer":
        return <User className="w-4 h-4 text-purple-500" />;
      case "product":
        return <Package className="w-4 h-4 text-emerald-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case "serial":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
      case "invoice":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300";
      case "customer":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
      case "product":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const results = data?.results || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-3 sm:py-6">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-8 space-y-4">
        {/* Top Header & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between px-3.5 py-3 bg-white dark:bg-dark-card rounded-xl shadow-xs border border-gray-200 dark:border-dark-border gap-3">
          {/* Title Area */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-ink-base dark:text-slate-100 leading-tight">
                Warranty & RMA Trace
              </h1>
              <p className="text-[11px] text-ink-muted dark:text-slate-400">
                Instant serial origin lookup, customer sales invoice & supplier RMA target
              </p>
            </div>
          </div>

          {/* Search Input Bar with Suggestions Dropdown */}
          <div ref={searchContainerRef} className="relative flex-1 md:max-w-xl">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                    setSelectedIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search Serial, Customer Phone, Customer Name, or Invoice #..."
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setShowSuggestions(true);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                isLoading={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-xs shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Trace</span>
              </Button>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                <div className="px-3.5 py-2 bg-gray-50 dark:bg-dark-input/60 border-b border-gray-100 dark:border-dark-border flex items-center justify-between text-xs text-ink-muted dark:text-slate-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    {query.trim() ? `Suggestions for "${query}"` : "Recent Products, Invoices & Serials"}
                  </span>
                  <span className="text-[10px] text-gray-400">Click or press Enter</span>
                </div>

                {suggestions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400">
                    {isSuggestionsLoading ? "Searching..." : "No matching suggestions found. Press Enter to trace origin."}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-dark-border">
                    {suggestions.map((item, idx) => {
                      const isSelected = selectedIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
                              : "hover:bg-gray-50 dark:hover:bg-dark-subtle text-ink-base dark:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-dark-input shrink-0">
                              {getSuggestionIcon(item.type)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate text-ink-base dark:text-slate-100">
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-[11px] text-ink-muted dark:text-slate-400 truncate">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${getBadgeClass(
                              item.type
                            )}`}
                          >
                            {item.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex justify-center p-12 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-xs">
            <LoadingSpinner />
          </div>
        )}

        {/* Error Alert */}
        {isError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-xs sm:text-sm">
            {error?.data?.message || "Failed to fetch warranty details. Please try again."}
          </div>
        )}

        {/* Empty State / Initial Guide */}
        {!isLoading && !data && (
          <div className="text-center py-12 px-4 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-xs">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-ink-base dark:text-slate-100">
              Ready to Trace Warranty & RMA Target
            </h3>
            <p className="text-xs text-ink-secondary dark:text-slate-400 max-w-md mx-auto mt-1">
              Enter any product serial number, customer name, mobile number, or invoice # above to immediately trace origin supplier and customer purchase warranty.
            </p>
          </div>
        )}

        {/* No Results Found */}
        {!isLoading && data && results.length === 0 && (
          <div className="text-center py-12 px-4 bg-white dark:bg-dark-card rounded-xl border border-dashed border-gray-300 dark:border-dark-border shadow-xs">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <h3 className="text-sm sm:text-base font-bold text-ink-base dark:text-slate-100">
              No Matching Record Found
            </h3>
            <p className="text-xs text-ink-secondary dark:text-slate-400 max-w-md mx-auto mt-1">
              We couldn't find any unit or invoice matching "{query}". Please verify the serial number or customer contact number.
            </p>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-4">
          {results.map((res, idx) => {
            const isExpired = res.warranty?.is_expired;
            const dealer = res.dealer;
            const invoice = res.invoice;

            return (
              <div
                key={idx}
                className="bg-white dark:bg-dark-card rounded-xl shadow-xs border border-gray-200 dark:border-dark-border overflow-hidden"
              >
                {/* Top Status Header */}
                <div
                  className={`px-4 sm:px-6 py-2.5 border-b flex flex-wrap justify-between items-center gap-2 text-xs font-semibold ${
                    isExpired
                      ? "bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50"
                      : "bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isExpired ? (
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span>
                      Serial Number:{" "}
                      <strong className="font-mono text-xs sm:text-sm tracking-wide uppercase">
                        {res.serial_number}
                      </strong>
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isExpired
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    {isExpired ? "Warranty Expired" : "Active Warranty"}
                  </span>
                </div>

                {/* 3-Column Responsive Grid */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-dark-border">
                  {/* Col 1: Product & Warranty */}
                  <div className="space-y-2.5 md:pr-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted dark:text-slate-400 uppercase tracking-wider">
                      <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Product Details
                    </div>
                    <div>
                      <h3 className="font-bold text-ink-base dark:text-slate-100 text-sm sm:text-base">
                        {res.product_name}
                      </h3>
                      <p className="text-xs text-ink-secondary dark:text-slate-400">
                        {res.company} {res.model_number ? `| Model: ${res.model_number}` : ""}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50/70 dark:bg-dark-input/50 rounded-xl border border-gray-100 dark:border-dark-border/60 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink-secondary dark:text-slate-400">Category:</span>
                        <span className="font-semibold text-ink-base dark:text-slate-200">
                          {res.product_category}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-secondary dark:text-slate-400">Coverage:</span>
                        <span className="font-semibold text-ink-base dark:text-slate-200">
                          {res.warranty?.duration_months || 0} Months
                        </span>
                      </div>
                      {res.warranty?.start_date && (
                        <div className="flex justify-between">
                          <span className="text-ink-secondary dark:text-slate-400">Start Date:</span>
                          <span className="text-ink-base dark:text-slate-200">{formatDate(res.warranty.start_date)}</span>
                        </div>
                      )}
                      {res.warranty?.end_date && (
                        <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-dark-border/60">
                          <span className="text-ink-secondary dark:text-slate-400">End Date:</span>
                          <strong className={isExpired ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                            {formatDate(res.warranty.end_date)}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Col 2: Sales Invoice & Customer */}
                  <div className="space-y-2.5 pt-4 md:pt-0 md:px-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted dark:text-slate-400 uppercase tracking-wider">
                      <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Customer Sales Invoice
                    </div>

                    {invoice ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[11px] text-ink-muted dark:text-slate-400">Invoice Number:</span>
                          <h4 className="font-mono text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-400">
                            {invoice.invoice_number}
                          </h4>
                        </div>
                        <div className="p-3 bg-slate-50/70 dark:bg-dark-input/50 rounded-xl border border-gray-100 dark:border-dark-border/60 space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-ink-secondary dark:text-slate-400">Customer:</span>
                            <strong className="text-ink-base dark:text-slate-100">
                              {invoice.customer_name || "N/A"}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-secondary dark:text-slate-400">Phone:</span>
                            <span className="font-mono font-semibold text-ink-base dark:text-slate-200">
                              {invoice.customer_mobile || "N/A"}
                            </span>
                          </div>
                          {invoice.customer_email && (
                            <div className="flex justify-between">
                              <span className="text-ink-secondary dark:text-slate-400">Email:</span>
                              <span className="text-ink-base dark:text-slate-200 truncate max-w-[150px]">
                                {invoice.customer_email}
                              </span>
                            </div>
                          )}
                          {invoice.customer_address && (
                            <div className="flex justify-between">
                              <span className="text-ink-secondary dark:text-slate-400">Address:</span>
                              <span className="text-ink-base dark:text-slate-200 truncate max-w-[150px]">
                                {invoice.customer_address}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-dark-border/60">
                            <span className="text-ink-secondary dark:text-slate-400">Invoice Date:</span>
                            <span className="text-ink-base dark:text-slate-200">{formatDate(invoice.invoice_date)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50/70 dark:bg-dark-input/30 rounded-xl text-center text-xs text-ink-muted dark:text-slate-400 border border-gray-100 dark:border-dark-border/60">
                        Item is currently in warehouse stock (Not sold yet).
                      </div>
                    )}
                  </div>

                  {/* Col 3: Supplier / Dealer RMA Action Box */}
                  <div className="space-y-2.5 pt-4 md:pt-0 md:pl-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted dark:text-slate-400 uppercase tracking-wider">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Origin Supplier (RMA Target)
                      </div>
                      <div className="flex items-center gap-1.5">
                        {dealer?.is_retired && (
                          <span className="text-[9.5px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                            Retired
                          </span>
                        )}
                        {dealer && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedRetroItem({
                                _id: res.inventory_item_id,
                                inventory_item_id: res.inventory_item_id,
                                serial_number: res.serial_number,
                                product_name: res.product_name,
                                status: res.status || "SOLD",
                                purchase_date: res.purchase_date,
                                purchase_invoice_ref: res.purchase_invoice_ref,
                                dealer_id: res.dealer?._id,
                              })
                            }
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {dealer ? (
                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-1.5">
                          <h4 className="text-sm font-bold text-ink-base dark:text-slate-100">
                            {dealer.name}
                          </h4>
                          {dealer.contact_person && (
                            <p className="text-[11px] text-ink-secondary dark:text-slate-400">
                              Attn: {dealer.contact_person}
                            </p>
                          )}

                          <div className="space-y-1 pt-1 text-ink-secondary dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-blue-500" />
                              <span className="font-mono font-semibold text-ink-base dark:text-slate-100">{dealer.phone}</span>
                            </div>
                            {dealer.email && (
                              <p className="text-[11px] truncate text-ink-secondary dark:text-slate-400">
                                Email: {dealer.email}
                              </p>
                            )}
                            {dealer.tax_id && (
                              <p className="text-[11px] font-mono text-ink-secondary dark:text-slate-400">
                                GSTIN: {dealer.tax_id}
                              </p>
                            )}
                            {dealer.address && (
                              <p className="text-[11px] pt-1 border-t border-blue-100/60 dark:border-blue-900/40 text-ink-secondary dark:text-slate-400">
                                {dealer.address}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-1">
                          <a
                            href={`tel:${dealer.phone}`}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs text-center flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                          <a
                            href={`https://wa.me/${dealer.phone?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                              `Hello ${dealer.name}, processing RMA claim for Serial #${res.serial_number} (${res.product_name}).`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs text-center flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs space-y-2.5 border border-amber-200 dark:border-amber-800/60">
                        <div>
                          <p className="font-bold text-xs">No Origin Supplier Linked</p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                            This unit was sold without a registered supplier. Link the purchase origin directly to enable supplier RMA tracking.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedRetroItem({
                              _id: res.inventory_item_id,
                              inventory_item_id: res.inventory_item_id,
                              serial_number: res.serial_number,
                              product_name: res.product_name,
                              status: res.status || "SOLD",
                              purchase_date: res.purchase_date,
                              purchase_invoice_ref: res.purchase_invoice_ref,
                              dealer_id: null,
                            })
                          }
                          className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:hover:bg-amber-900/70 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-semibold text-xs py-2 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs rounded-lg"
                        >
                          <Building2 className="w-3.5 h-3.5" /> Link Origin Supplier
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Logs Trail */}
                {res.audit_logs && res.audit_logs.length > 0 && (
                  <div className="bg-slate-50/60 dark:bg-slate-800/30 px-4 sm:px-6 py-2 border-t border-gray-100 dark:border-dark-border flex items-center gap-2 text-xs text-ink-secondary dark:text-slate-400">
                    <History className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">
                      Audit Trail: <strong className="text-ink-base dark:text-slate-200">{res.audit_logs.length} Logged Action(s)</strong> (Latest: {res.audit_logs[0]?.action} on {formatDate(res.audit_logs[0]?.createdAt)})
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Retroactive Dealer / Origin Supplier Link Modal */}
      <RetroactiveDealerModal
        isOpen={Boolean(selectedRetroItem)}
        onClose={() => setSelectedRetroItem(null)}
        item={selectedRetroItem}
        onSuccess={() => {
          if (query.trim()) {
            triggerLookup(query.trim());
          }
        }}
      />
    </div>
  );
};

export default WarrantyLookup;
