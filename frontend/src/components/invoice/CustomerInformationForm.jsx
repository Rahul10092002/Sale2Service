import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  User,
  MapPin,
  FileText,
  X,
} from "lucide-react";
import { Input, SelectField } from "../ui/index.js";
import { useInvoiceForm } from "../../features/invoices/hooks.js";
import { useGetCustomersQuery } from "../../features/customers/customerApi.js";

const CustomerInformationForm = () => {
  const {
    currentInvoice,
    expandedSections,
    updateCustomerData,
    updateCustomerAddressData,
    errors = {},
    toggleCustomerOptional,
  } = useInvoiceForm();
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef(null);
  const [queryParams, setQueryParams] = useState(null);

  const { customer } = currentInvoice;

  // Handle customer search by WhatsApp
  const handleCustomerSearch = useCallback(() => {
    if (!customer.whatsapp_number || customer.whatsapp_number.length < 4)
      return;
    setQueryParams({ search: customer.whatsapp_number });
  }, [customer.whatsapp_number]);

  // Debounce input and set query params for RTK Query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!customer.whatsapp_number || customer.whatsapp_number.length < 4) {
      setQueryParams(null);
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setQueryParams({ search: customer.whatsapp_number });
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [customer.whatsapp_number]);

  // Execute query using RTK Query hook
  const { data, isFetching: isFetchingCustomers } = useGetCustomersQuery(
    queryParams,
    {
      skip: !queryParams,
    },
  );

  useEffect(() => {
    setIsSearching(Boolean(isFetchingCustomers));
  }, [isFetchingCustomers]);

  useEffect(() => {
    const customersList = data && data.customers ? data.customers : [];
    if (customersList.length > 0) {
      setSuggestions(customersList);
    } else {
      setSuggestions([]);
    }
  }, [data]);

  const handleSelectSuggestion = (c) => {
    updateCustomerData(c);
    updateCustomerAddressData(c.address || {});
    setSuggestions([]);
  };

  // Auto-expand optional section if it has validation errors
  const isAdditionalOpen =
    Boolean(expandedSections.customerOptional) ||
    Boolean(errors["customer.email"]) ||
    Boolean(errors["customer.alternate_phone"]) ||
    Boolean(errors["customer.gst_number"]) ||
    Boolean(errors["customer.date_of_birth"]) ||
    Boolean(errors["customer.anniversary_date"]) ||
    Boolean(errors["customer.address.line2"]) ||
    Boolean(errors["customer.notes"]);

  // Summary badge derivation for additional information
  const optionalCount = [
    customer.email,
    customer.gst_number,
    customer.alternate_phone,
    customer.preferred_language && customer.preferred_language !== "ENGLISH" ? customer.preferred_language : null,
    customer.notes,
  ].filter(Boolean).length;

  const optionalSummary =
    optionalCount > 0 ? `${optionalCount} detail${optionalCount > 1 ? "s" : ""} added` : "Optional details";

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-200/90 dark:border-dark-border rounded-xl p-3 sm:p-4 shadow-xs relative transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-gray-100 dark:border-dark-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">
              Customer Information
            </h2>
            <p className="text-[11px] text-ink-muted dark:text-slate-400 mt-0.5">
              Enter or search customer details for billing & warranty
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Primary Contact Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {/* WhatsApp Number with Quick Search */}
          <div className="col-span-1 relative">
            <label className="block text-xs font-bold text-ink-secondary dark:text-slate-200 mb-1">
              WhatsApp Number *
            </label>
            <div className="relative">
              <div
                className={`flex items-center w-full h-9 sm:h-8 rounded-lg overflow-hidden border bg-white dark:bg-dark-input transition-colors ${
                  errors["customer.whatsapp_number"]
                    ? "border-danger focus-within:ring-2 focus-within:ring-danger/20 focus-within:border-danger"
                    : "border-gray-300 dark:border-dark-border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary dark:focus-within:border-primary-dark"
                }`}
              >
                <div className="relative flex-1 h-full flex items-center">
                  <input
                    type="tel"
                    inputMode="tel"
                    value={customer.whatsapp_number || ""}
                    onChange={(e) =>
                      updateCustomerData({ whatsapp_number: e.target.value })
                    }
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                      handleCustomerSearch();
                      setTimeout(() => setIsFocused(false), 200);
                    }}
                    placeholder="+91 9876543210"
                    className="w-full h-full px-3 text-sm sm:text-xs font-semibold bg-transparent border-0 focus:ring-0 focus:outline-none text-ink-base dark:text-slate-100 placeholder:text-ink-muted dark:placeholder:text-slate-500"
                  />
                  {customer.whatsapp_number && (
                    <button
                      type="button"
                      onClick={() => {
                        updateCustomerData({ whatsapp_number: "" });
                        setSuggestions([]);
                      }}
                      className="p-1 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-full transition-colors"
                      aria-label="Clear phone number"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCustomerSearch}
                  disabled={isSearching || !customer.whatsapp_number}
                  className="h-full px-2.5 sm:px-3 flex items-center justify-center border-l border-gray-200 dark:border-dark-border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors font-medium text-xs gap-1 disabled:opacity-50 shrink-0"
                  aria-label="Search customer by WhatsApp"
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent" />
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Search</span>
                    </>
                  )}
                </button>
              </div>

              {errors["customer.whatsapp_number"] && (
                <p className="mt-1 text-[11px] text-danger flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors["customer.whatsapp_number"]}
                </p>
              )}

              {/* Suggestions Dropdown */}
              {suggestions && suggestions.length > 0 && isFocused && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {suggestions.map((s) => (
                    <button
                      key={s._id || s.id || s.whatsapp_number}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left p-2.5 sm:p-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 dark:text-slate-100 flex items-center gap-2.5 active:scale-98 transition-transform min-h-[44px]"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                        <User size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {s.full_name || "Unnamed"}
                        </div>
                        <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                          {s.whatsapp_number} {s.address?.city ? `· ${s.address.city}` : ""}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div className="col-span-1">
            <label className="block text-xs font-bold text-ink-secondary dark:text-slate-200 mb-1">
              Full Name *
            </label>
            <Input
              type="text"
              value={customer.full_name || ""}
              onChange={(e) =>
                updateCustomerData({ full_name: e.target.value })
              }
              placeholder="Customer full name"
              error={errors["customer.full_name"]}
              inputClassName="h-9 sm:h-8 text-xs font-semibold"
            />
          </div>
        </div>

        {/* Address Fields */}
        <div className="pt-2 border-t border-gray-100 dark:border-dark-border/60">
          <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Address Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                Address Line 1 *
              </label>
              <Input
                type="text"
                value={customer.address.line1 || ""}
                onChange={(e) =>
                  updateCustomerAddressData({ line1: e.target.value })
                }
                placeholder="Building, Street, Area"
                error={errors["customer.address.line1"]}
                inputClassName="h-9 sm:h-8 text-xs"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                City *
              </label>
              <Input
                type="text"
                value={customer.address.city || ""}
                onChange={(e) =>
                  updateCustomerAddressData({ city: e.target.value })
                }
                placeholder="City"
                error={errors["customer.address.city"]}
                inputClassName="h-9 sm:h-8 text-xs"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                State *
              </label>
              <Input
                type="text"
                value={customer.address.state || ""}
                onChange={(e) =>
                  updateCustomerAddressData({ state: e.target.value })
                }
                placeholder="State"
                error={errors["customer.address.state"]}
                inputClassName="h-9 sm:h-8 text-xs"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                Pincode *
              </label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={customer.address.pincode || ""}
                onChange={(e) =>
                  updateCustomerAddressData({ pincode: e.target.value })
                }
                placeholder="400001"
                error={errors["customer.address.pincode"]}
                inputClassName="h-9 sm:h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* ── Progressive Disclosure: Additional Customer Details ── */}
        <div className="rounded-lg border border-gray-100 dark:border-dark-border/70 overflow-hidden bg-gray-50/50 dark:bg-dark-bg/40">
          <button
            type="button"
            id="tray-btn-customer-optional"
            aria-controls="tray-panel-customer-optional"
            aria-expanded={isAdditionalOpen}
            onClick={() => toggleCustomerOptional()}
            className="w-full flex items-center justify-between p-2.5 sm:px-3 text-left hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                Additional Information
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200/80 dark:bg-dark-hover text-gray-700 dark:text-slate-300">
                {optionalSummary}
              </span>
              {errors["customer.email"] && (
                <span className="text-[10px] text-red-500 font-bold">
                  • Invalid Email
                </span>
              )}
            </div>
            {isAdditionalOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            )}
          </button>

          {isAdditionalOpen && (
            <div
              id="tray-panel-customer-optional"
              role="region"
              aria-labelledby="tray-btn-customer-optional"
              className="p-2.5 sm:p-3 pt-1 border-t border-gray-100 dark:border-dark-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5"
            >
              <div>
                <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  Alternate Phone
                </label>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={customer.alternate_phone || ""}
                  onChange={(e) =>
                    updateCustomerData({ alternate_phone: e.target.value })
                  }
                  placeholder="+91 9876543210"
                  inputClassName="h-9 sm:h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  inputMode="email"
                  value={customer.email || ""}
                  onChange={(e) =>
                    updateCustomerData({ email: e.target.value })
                  }
                  placeholder="customer@example.com"
                  error={errors["customer.email"]}
                  inputClassName="h-9 sm:h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  GST Number
                </label>
                <Input
                  type="text"
                  value={customer.gst_number || ""}
                  onChange={(e) =>
                    updateCustomerData({
                      gst_number: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  inputClassName="h-9 sm:h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  value={customer.date_of_birth || ""}
                  onChange={(e) =>
                    updateCustomerData({ date_of_birth: e.target.value })
                  }
                  inputClassName="h-9 sm:h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  Anniversary Date
                </label>
                <Input
                  type="date"
                  value={customer.anniversary_date || ""}
                  onChange={(e) =>
                    updateCustomerData({ anniversary_date: e.target.value })
                  }
                  inputClassName="h-9 sm:h-8 text-xs"
                />
              </div>

              <div>
                <SelectField
                  id="preferred-language"
                  label="Preferred Language"
                  value={customer.preferred_language || "ENGLISH"}
                  onChange={(e) =>
                    updateCustomerData({ preferred_language: e.target.value })
                  }
                  options={[
                    { value: "ENGLISH", label: "English" },
                    { value: "HINDI", label: "Hindi" },
                    { value: "TAMIL", label: "Tamil" },
                    { value: "TELUGU", label: "Telugu" },
                    { value: "KANNADA", label: "Kannada" },
                    { value: "MALAYALAM", label: "Malayalam" },
                  ]}
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  Address Line 2 (Optional)
                </label>
                <Input
                  type="text"
                  value={customer.address.line2 || ""}
                  onChange={(e) =>
                    updateCustomerAddressData({ line2: e.target.value })
                  }
                  placeholder="Landmark, Near, Floor"
                  inputClassName="h-9 sm:h-8 text-xs"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-ink-secondary dark:text-slate-300 mb-1">
                  Customer Notes
                </label>
                <textarea
                  rows={2}
                  value={customer.notes || ""}
                  onChange={(e) =>
                    updateCustomerData({ notes: e.target.value })
                  }
                  placeholder="Any special customer preferences or notes..."
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none dark:bg-dark-bg dark:text-slate-100"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerInformationForm;
