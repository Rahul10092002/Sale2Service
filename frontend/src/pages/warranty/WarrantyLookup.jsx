import React, { useState } from "react";
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
} from "lucide-react";
import { useLazyLookupWarrantyQuery } from "../../features/warranty/warrantyApi.js";
import { Button, LoadingSpinner } from "../../components/ui/index.js";

const WarrantyLookup = () => {
  const [query, setQuery] = useState("");
  const [triggerLookup, { data, isLoading, isError, error }] = useLazyLookupWarrantyQuery();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      triggerLookup(query.trim());
    }
  };

  const results = data?.results || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> Support & Warranty Claim Assistant
          </div>
          <h1 className="text-2xl font-black text-white">Warranty & RMA Lookup</h1>
          <p className="text-sm text-blue-200 mt-1 max-w-xl">
            Instantly trace product serials to customer sales invoices and origin suppliers for seamless RMA claim processing.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Serial Number (e.g. SN-1001), Customer Phone, Customer Name, or Invoice #..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button
            type="submit"
            isLoading={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-semibold text-sm flex items-center gap-2"
          >
            <Search className="w-4 h-4" /> Trace Origin
          </Button>
        </form>
      </div>

      {/* Lookup Results */}
      {isLoading && (
        <div className="flex justify-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <LoadingSpinner />
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
          {error?.data?.message || "Failed to fetch warranty details. Please try again."}
        </div>
      )}

      {!isLoading && data && results.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Matching Record Found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
            We couldn't find any unit or invoice matching "{query}". Please verify the serial number or customer contact number.
          </p>
        </div>
      )}

      {/* Result Cards List */}
      <div className="space-y-6">
        {results.map((res, idx) => {
          const isExpired = res.warranty?.is_expired;
          const dealer = res.dealer;
          const invoice = res.invoice;

          return (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Top Banner */}
              <div className={`px-6 py-3 border-b flex justify-between items-center text-xs font-semibold ${
                isExpired
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
              }`}>
                <div className="flex items-center gap-2">
                  {isExpired ? (
                    <Clock className="w-4 h-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>
                    Serial Number: <strong className="text-sm tracking-wide uppercase">{res.serial_number}</strong>
                  </span>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  isExpired ? "bg-amber-200 text-amber-900" : "bg-emerald-200 text-emerald-900"
                }`}>
                  {isExpired ? "Warranty Expired" : "Active Warranty"}
                </span>
              </div>

              {/* 3-Column Grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Col 1: Product & Warranty */}
                <div className="space-y-3 border-r border-gray-100 dark:border-gray-700/80 pr-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                    <Tag className="w-4 h-4 text-blue-600" /> Product Details
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{res.product_name}</h3>
                    <p className="text-xs text-gray-500">
                      {res.company} {res.model_number ? `| Model: ${res.model_number}` : ""}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{res.product_category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Warranty Coverage:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{res.warranty?.duration_months || 0} Months</span>
                    </div>
                    {res.warranty?.start_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Coverage Start:</span>
                        <span>{new Date(res.warranty.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {res.warranty?.end_date && (
                      <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-500">Coverage End:</span>
                        <strong className={isExpired ? "text-amber-600" : "text-emerald-600"}>
                          {new Date(res.warranty.end_date).toLocaleDateString()}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Col 2: Sales Invoice & Customer */}
                <div className="space-y-3 border-r border-gray-100 dark:border-gray-700/80 pr-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                    <User className="w-4 h-4 text-indigo-600" /> Customer Sales Invoice
                  </div>

                  {invoice ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-gray-400">Invoice Number:</span>
                        <h4 className="text-base font-black text-indigo-600 dark:text-indigo-400">
                          {invoice.invoice_number}
                        </h4>
                      </div>
                      <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Customer Name:</span>
                          <strong className="text-gray-900 dark:text-white">{invoice.customer_name}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Phone Number:</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{invoice.customer_mobile}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                          <span className="text-gray-500">Invoice Date:</span>
                          <span>{new Date(invoice.invoice_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl text-center text-xs text-gray-400">
                      Item is currently in warehouse stock (Not sold yet).
                    </div>
                  )}
                </div>

                {/* Col 3: Supplier / Dealer RMA Action Box */}
                <div className="space-y-3 bg-linear-to-b from-blue-50/50 to-indigo-50/40 dark:from-gray-900/80 dark:to-gray-900/40 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">
                      <Building2 className="w-4 h-4" /> Origin Supplier (RMA Target)
                    </div>
                    {dealer?.is_retired && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                        Retired Dealer
                      </span>
                    )}
                  </div>

                  {dealer ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">
                          {dealer.name}
                        </h4>
                        {dealer.contact_person && (
                          <p className="text-gray-500">Attn: {dealer.contact_person}</p>
                        )}
                      </div>

                      <div className="space-y-1.5 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-semibold text-gray-900 dark:text-white">{dealer.phone}</span>
                        </div>
                        {dealer.email && (
                          <p className="text-gray-500 truncate">Email: {dealer.email}</p>
                        )}
                        {dealer.tax_id && (
                          <p className="text-gray-500">GSTIN: {dealer.tax_id}</p>
                        )}
                        {dealer.address && (
                          <p className="text-gray-500 pt-1 border-t border-gray-200 dark:border-gray-700">
                            {dealer.address}
                          </p>
                        )}
                      </div>

                      {/* Immediate Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <a
                          href={`tel:${dealer.phone}`}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs text-center flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call Supplier
                        </a>
                        <a
                          href={`https://wa.me/${dealer.phone?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                            `Hello ${dealer.name}, processing RMA claim for Serial #${res.serial_number} (${res.product_name}).`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs text-center flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs space-y-2 border border-amber-200 dark:border-amber-800">
                      <p className="font-semibold">No Origin Supplier Linked</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        This unit was sold without a registered supplier. Open the Invoice detail view to retroactively link the supplier.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Audit Logs Accordion / Summary */}
              {res.audit_logs && res.audit_logs.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/60 px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-xs text-gray-500">
                  <History className="w-4 h-4 text-gray-400" />
                  <span>
                    Audit Trail: <strong className="text-gray-700 dark:text-gray-300">{res.audit_logs.length} Logged Action(s)</strong> (Latest: {res.audit_logs[0]?.action} on {new Date(res.audit_logs[0]?.createdAt).toLocaleDateString()})
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WarrantyLookup;
