import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Package,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileSpreadsheet,
  ShieldCheck,
  Calendar,
  Phone,
  FileText,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
import { formatDate } from "../../utils/date.js";
import { useGetInventoryItemsQuery } from "../../features/inventory/inventoryApi.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import DealersModal from "./DealersModal.jsx";
import ReceivingSlipModal from "./ReceivingSlipModal.jsx";
import RetroactiveDealerModal from "./RetroactiveDealerModal.jsx";

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "BATTERY", label: "Battery" },
  { value: "INVERTER", label: "Inverter" },
  { value: "UPS", label: "UPS" },
  { value: "SOLAR_PANEL", label: "Solar Panel" },
  { value: "CHARGER", label: "Charger" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "OTHER", label: "Other" },
];

const QUICK_STATUS_PILLS = [
  { value: "", label: "All Units" },
  { value: "IN_STOCK", label: "In Stock" },
  { value: "SOLD", label: "Sold" },
  { value: "DEFECTIVE_RMA", label: "Defective RMA" },
  { value: "RETURNED", label: "Returned" },
];

const Inventory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { canCreate } = usePermissions();

  // Modal States
  const [showDealersModal, setShowDealersModal] = useState(false);
  const [showReceivingSlipModal, setShowReceivingSlipModal] = useState(false);
  const [selectedRetroItem, setSelectedRetroItem] = useState(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [stockStatus, setStockStatus] = useState(searchParams.get("stockStatus") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  // Query Unit Inventory Items
  const { data: unitInventoryData, isLoading: isLoadingUnits } = useGetInventoryItemsQuery({
    search: searchTerm,
    status: stockStatus !== "IN_STOCK" && stockStatus !== "OUT_OF_STOCK" ? stockStatus : undefined,
    page,
    limit: 15,
  });

  const unitItems = unitInventoryData?.items || [];
  const unitPagination = unitInventoryData?.pagination || { page: 1, pages: 1, total: 0 };

  const updateURL = (newState) => {
    const params = {};
    const finalState = {
      search: searchTerm,
      category,
      stockStatus,
      page,
      ...newState,
    };

    if (finalState.search) params.search = finalState.search;
    if (finalState.category) params.category = finalState.category;
    if (finalState.stockStatus) params.stockStatus = finalState.stockStatus;
    if (finalState.page > 1) params.page = finalState.page;

    setSearchParams(params);
  };

  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
    setCategory(searchParams.get("category") || "");
    setStockStatus(searchParams.get("stockStatus") || "");
    setPage(Number(searchParams.get("page")) || 1);
  }, [location.search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > unitPagination.pages) return;
    setPage(newPage);
    updateURL({ page: newPage });
  };

  const toggleFilter = () => setShowFilters(!showFilters);

  const getStatusBadge = (status) => {
    switch (status) {
      case "IN_STOCK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> In Stock
          </span>
        );
      case "SOLD":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <FileText className="w-3 h-3" /> Sold
          </span>
        );
      case "DEFECTIVE_RMA":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-3 h-3" /> Defective RMA
          </span>
        );
      case "RETURNED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <RotateCcw className="w-3 h-3" /> Returned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            {status || "UNKNOWN"}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pb-20 sm:pb-8 pt-4 sm:pt-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4">
        {/* Top Header & Actions - Mobile App Optimized */}
        <div className="bg-white dark:bg-dark-card p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200 dark:border-dark-border space-y-3 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <Package className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Inventory & Stock
                </h1>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                  Track physical units, serials & suppliers
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 pt-1 sm:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDealersModal(true)}
              className="w-full sm:w-auto min-h-[42px] sm:min-h-[36px] flex items-center justify-center gap-1.5 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-xs active:scale-98 transition-transform"
            >
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" /> Suppliers
            </Button>

            <Button
              size="sm"
              onClick={() => setShowReceivingSlipModal(true)}
              className="w-full sm:w-auto min-h-[42px] sm:min-h-[36px] bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 shadow-xs font-semibold text-xs active:scale-98 transition-transform"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" /> Add Stock
            </Button>
          </div>
        </div>

        {/* Filters & Search Section */}
        <div className="bg-white dark:bg-dark-card p-3 rounded-2xl shadow-xs border border-gray-200 dark:border-dark-border space-y-2.5">
          {/* Top Row: Search Input + Advanced Filter Trigger */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search serial # or product..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  updateURL({ search: e.target.value, page: 1 });
                }}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-xs sm:text-sm text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    updateURL({ search: "", page: 1 });
                  }}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Advanced Filters Dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={toggleFilter}
                className={`min-h-[38px] px-3 flex items-center gap-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  category || stockStatus
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {(category || stockStatus) && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>

              {showFilters && (
                <div className="absolute right-0 top-11 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl shadow-2xl p-4 z-30 w-[290px] sm:w-[320px] space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-2">
                    <h3 className="text-xs font-bold text-gray-800 dark:text-slate-100 uppercase tracking-wider">
                      Detailed Filters
                    </h3>
                    <button
                      onClick={() => {
                        setCategory("");
                        setStockStatus("");
                        updateURL({ category: "", stockStatus: "", page: 1 });
                      }}
                      className="text-xs text-red-500 hover:text-red-600 font-semibold"
                    >
                      Reset All
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        updateURL({ category: e.target.value, page: 1 });
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-card text-gray-900 dark:text-slate-100 font-medium"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Stock Status
                    </label>
                    <select
                      value={stockStatus}
                      onChange={(e) => {
                        setStockStatus(e.target.value);
                        updateURL({ stockStatus: e.target.value, page: 1 });
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-card text-gray-900 dark:text-slate-100 font-medium"
                    >
                      <option value="">All Statuses</option>
                      <option value="IN_STOCK">In Stock</option>
                      <option value="SOLD">Sold</option>
                      <option value="RETURNED">Returned</option>
                      <option value="DEFECTIVE_RMA">Defective RMA</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Filter Horizontal Scroll Pills (PWA Mobile Experience) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
            {QUICK_STATUS_PILLS.map((pill) => {
              const isActive = stockStatus === pill.value;
              return (
                <button
                  key={pill.value}
                  onClick={() => {
                    setStockStatus(pill.value);
                    updateURL({ stockStatus: pill.value, page: 1 });
                  }}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold text-[11px] transition-all active:scale-95 border ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* INVENTORY CONTENT AREA */}
        <div className="space-y-3">
          {isLoadingUnits ? (
            <div className="flex justify-center p-12 bg-white dark:bg-dark-card rounded-2xl shadow-xs border border-gray-200 dark:border-dark-border">
              <LoadingSpinner />
            </div>
          ) : unitItems.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-dark-card rounded-2xl shadow-xs border border-gray-200 dark:border-dark-border px-4">
              <ShieldCheck className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-base font-bold text-gray-800 dark:text-gray-200">
                No Inventory Units Found
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                No stock items match your search or filter options. Use "Add Stock" to log incoming shipments.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE PWA CARD LIST (< md screens) */}
              <div className="block md:hidden space-y-3">
                {unitItems.map((item) => (
                  <div
                    key={item._id}
                    className="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-xs border border-gray-200 dark:border-dark-border space-y-3 relative active:border-blue-400 transition-colors"
                  >
                    {/* Header: Serial & Status */}
                    <div className="flex justify-between items-start gap-2 border-b border-gray-100 dark:border-gray-800 pb-2.5">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">
                          Serial Number
                        </span>
                        <span className="font-mono font-bold text-sm text-gray-900 dark:text-white uppercase tracking-tight">
                          {item.serial_number || "N/A (Legacy)"}
                        </span>
                      </div>
                      <div>{getStatusBadge(item.status)}</div>
                    </div>

                    {/* Product Title */}
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-snug">
                        {item.product_name}
                      </h3>
                    </div>

                    {/* Key Attributes Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      {/* Supplier */}
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
                        <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 mb-0.5">
                          <Building2 className="w-3 h-3 text-blue-500" /> Supplier
                        </span>
                        {item.dealer_id ? (
                          <div>
                            <strong className="text-gray-900 dark:text-gray-100 font-bold block truncate">
                              {item.dealer_id.name}
                            </strong>
                            {item.dealer_id.phone && (
                              <a
                                href={`tel:${item.dealer_id.phone}`}
                                className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5 mt-0.5"
                              >
                                <Phone className="w-2.5 h-2.5" /> {item.dealer_id.phone}
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px] italic">
                            Unlinked
                          </span>
                        )}
                      </div>

                      {/* Purchase Invoice / Date */}
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
                        <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 mb-0.5">
                          <Calendar className="w-3 h-3 text-indigo-500" /> Purchase Ref
                        </span>
                        <strong className="text-gray-900 dark:text-gray-100 font-mono block truncate">
                          {item.purchase_invoice_ref || "-"}
                        </strong>
                        {item.purchase_date && (
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {formatDate(item.purchase_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sales Invoice (if sold) */}
                    {item.invoice_id && (
                      <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <div>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block uppercase">
                              Sales Invoice
                            </span>
                            <strong className="text-blue-900 dark:text-blue-200 font-bold">
                              {item.invoice_id.invoice_number}
                            </strong>
                          </div>
                        </div>
                        {item.invoice_id.customer_name && (
                          <span className="text-[11px] text-gray-600 dark:text-gray-300 font-medium truncate max-w-[120px]">
                            {item.invoice_id.customer_name}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRetroItem(item)}
                        className="w-full min-h-[40px] text-xs font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 active:bg-blue-100 flex items-center justify-center gap-1.5"
                      >
                        <Building2 className="w-3.5 h-3.5" /> Edit Supplier Origin
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (≥ md screens) */}
              <div className="hidden md:block bg-white dark:bg-dark-card rounded-2xl shadow-xs border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700 dark:text-gray-200">
                    <thead className="bg-gray-100 dark:bg-gray-900/80 uppercase font-semibold text-gray-600 dark:text-gray-400">
                      <tr>
                        <th className="p-3">Serial Number</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Origin Supplier / Dealer</th>
                        <th className="p-3">Purchase Ref & Date</th>
                        <th className="p-3">Sales Invoice</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {unitItems.map((item) => (
                        <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="p-3 font-mono font-bold text-gray-900 dark:text-white uppercase">
                            {item.serial_number || "N/A (Legacy)"}
                          </td>
                          <td className="p-3 font-medium text-gray-900 dark:text-white">
                            {item.product_name}
                          </td>
                          <td className="p-3">{getStatusBadge(item.status)}</td>
                          <td className="p-3">
                            {item.dealer_id ? (
                              <div>
                                <strong className="text-gray-900 dark:text-white">{item.dealer_id.name}</strong>
                                {item.dealer_id.deleted_at && (
                                  <span className="ml-1 text-[10px] text-amber-600 font-medium">(Retired)</span>
                                )}
                                {item.dealer_id.phone && (
                                  <p className="text-[11px] text-gray-500">{item.dealer_id.phone}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold italic text-[11px]">
                                No Supplier Linked
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div>
                              <span className="font-mono text-gray-800 dark:text-gray-200">
                                {item.purchase_invoice_ref || "-"}
                              </span>
                              {item.purchase_date && (
                                <p className="text-[11px] text-gray-400">
                                  {formatDate(item.purchase_date)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {item.invoice_id ? (
                              <div>
                                <span className="text-blue-600 dark:text-blue-400 font-bold">
                                  {item.invoice_id.invoice_number}
                                </span>
                                {item.invoice_id.customer_name && (
                                  <p className="text-[11px] text-gray-500">{item.invoice_id.customer_name}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 font-medium">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setSelectedRetroItem(item)}
                              className="text-xs text-blue-600 hover:text-blue-800 border-blue-200 dark:border-blue-900"
                            >
                              Edit Origin
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PAGINATION CONTROLS */}
              {unitPagination.pages > 1 && (
                <div className="flex justify-between items-center bg-white dark:bg-dark-card p-3 rounded-2xl shadow-xs border border-gray-200 dark:border-dark-border text-xs">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="flex items-center gap-1 border-gray-300 dark:border-gray-600 font-semibold min-h-[36px]"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>

                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Page <strong className="text-blue-600 dark:text-blue-400">{page}</strong> of{" "}
                    <strong>{unitPagination.pages}</strong>
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= unitPagination.pages}
                    onClick={() => handlePageChange(page + 1)}
                    className="flex items-center gap-1 border-gray-300 dark:border-gray-600 font-semibold min-h-[36px]"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <DealersModal
        isOpen={showDealersModal}
        onClose={() => setShowDealersModal(false)}
      />

      <ReceivingSlipModal
        isOpen={showReceivingSlipModal}
        onClose={() => setShowReceivingSlipModal(false)}
        onOpenDealers={() => {
          setShowReceivingSlipModal(false);
          setShowDealersModal(true);
        }}
      />

      <RetroactiveDealerModal
        isOpen={Boolean(selectedRetroItem)}
        onClose={() => setSelectedRetroItem(null)}
        item={selectedRetroItem}
      />
    </div>
  );
};

export default Inventory;

