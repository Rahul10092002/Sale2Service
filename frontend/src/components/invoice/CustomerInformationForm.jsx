import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Globe,
} from "lucide-react";
import { Button, Input, SelectField } from "../ui/index.js";
import {
  INVOICE_CONSTANTS,
  VALIDATION_MESSAGES,
} from "../../utils/constants.js";
import { useInvoiceForm } from "../../features/invoices/hooks.js";
import { useGetCustomersQuery } from "../../features/customers/customerApi.js";

const CustomerInformationForm = () => {
  const {
    currentInvoice,
    expandedSections,
    updateCustomerData,
    updateCustomerAddressData,
    errors,
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
    // trigger immediate query
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

  // Mirror fetching state
  useEffect(() => {
    setIsSearching(Boolean(isFetchingCustomers));
  }, [isFetchingCustomers]);

  // Update suggestions when customers change. API returns { customers: [...], pagination }
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Customer Information
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter customer details for invoice generation
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Mandatory Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <Input
                type="text"
                value={customer.full_name}
                onChange={(e) =>
                  updateCustomerData({ full_name: e.target.value })
                }
                placeholder="Enter customer full name"
                error={errors["customer.full_name"]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Number *
              </label>
              <div className="relative">
                <div className="flex">
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    step="1"
                    value={customer.whatsapp_number}
                    onChange={(e) =>
                      updateCustomerData({ whatsapp_number: e.target.value })
                    }
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                      handleCustomerSearch();
                      setTimeout(() => setIsFocused(false), 150);
                    }}
                    placeholder="+91 9876543210"
                    error={errors["customer.whatsapp_number"]}
                    className="rounded-r-none flex-1 h-10 no-spinner"
                  />
                  <Button
                    type="button"
                    onClick={handleCustomerSearch}
                    disabled={isSearching || !customer.whatsapp_number}
                    className="rounded-l-none border-l-0 px-3 h-10 flex items-center justify-center min-w-0"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {suggestions && suggestions.length > 0 && isFocused && (
                  <div className="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                    {suggestions.map((s) => (
                      <button
                        key={s._id || s.id || s.whatsapp_number}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {s.full_name || "Unnamed"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {s.whatsapp_number}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <SelectField
                id="customer-type"
                label="Customer Type"
                value={customer.customer_type}
                onChange={(e) =>
                  updateCustomerData({ customer_type: e.target.value })
                }
                options={Object.entries(INVOICE_CONSTANTS.CUSTOMER_TYPES).map(
                  ([key, value]) => ({
                    value: value,
                    label: value,
                  }),
                )}
                required
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-md font-medium text-gray-900 flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-indigo-600" />
              Address Information
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 1 *
                </label>
                <Input
                  type="text"
                  value={customer.address.line1}
                  onChange={(e) =>
                    updateCustomerAddressData({ line1: e.target.value })
                  }
                  placeholder="Building, Street, Area"
                  error={errors["customer.address.line1"]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <Input
                  type="text"
                  value={customer.address.city}
                  onChange={(e) =>
                    updateCustomerAddressData({ city: e.target.value })
                  }
                  placeholder="City"
                  error={errors["customer.address.city"]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <Input
                  type="text"
                  value={customer.address.state}
                  onChange={(e) =>
                    updateCustomerAddressData({ state: e.target.value })
                  }
                  placeholder="State"
                  error={errors["customer.address.state"]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode *
                </label>
                <Input
                  type="text"
                  value={customer.address.pincode}
                  onChange={(e) =>
                    updateCustomerAddressData({ pincode: e.target.value })
                  }
                  placeholder="400001"
                  error={errors["customer.address.pincode"]}
                />
              </div>
            </div>
          </div>

          {/* Optional Section Toggle */}
          <div className="border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => {
                toggleCustomerOptional();
              }}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-md font-medium text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Additional Information
              </h3>
              {expandedSections.customerOptional ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.customerOptional && (
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alternate Phone
                  </label>
                  <Input
                    type="tel"
                    value={customer.alternate_phone}
                    onChange={(e) =>
                      updateCustomerData({ alternate_phone: e.target.value })
                    }
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={customer.email}
                    onChange={(e) =>
                      updateCustomerData({ email: e.target.value })
                    }
                    placeholder="customer@example.com"
                    error={errors["customer.email"]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    value={customer.date_of_birth}
                    onChange={(e) =>
                      updateCustomerData({ date_of_birth: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anniversary Date
                  </label>
                  <Input
                    type="date"
                    value={customer.anniversary_date}
                    onChange={(e) =>
                      updateCustomerData({ anniversary_date: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Number
                  </label>
                  <Input
                    type="text"
                    value={customer.gst_number}
                    onChange={(e) =>
                      updateCustomerData({
                        gst_number: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <Input
                    type="text"
                    value={customer.address.line2}
                    onChange={(e) =>
                      updateCustomerAddressData({ line2: e.target.value })
                    }
                    placeholder="Landmark, Near"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={customer.notes}
                    onChange={(e) =>
                      updateCustomerData({ notes: e.target.value })
                    }
                    placeholder="Any additional notes about the customer..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInformationForm;
