import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Package,
  Eye,
  Building2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  RotateCcw,
  Activity,
  Calendar,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
import { useGetInventoryItemsQuery } from "../../features/inventory/inventoryApi.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { ROUTES } from "../../utils/constants.js";
import { formatDate } from "../../utils/date.js";
import DealersModal from "./DealersModal.jsx";
import ReceivingSlipModal from "./ReceivingSlipModal.jsx";
import RetroactiveDealerModal from "./RetroactiveDealerModal.jsx";

const Chip = ({ label, onRemove }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-200 dark:border-blue-800">
      {label}
      <button
        onClick={onRemove}
        className="text-blue-500 dark:text-blue-400 hover:text-red-500 dark:hover:text-red-400 font-bold"
      >
        ✕
      </button>
    </div>
  );
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case "IN_STOCK":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "SOLD":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "DEFECTIVE_RMA":
    case "DEFECTIVE":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "RETURNED":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "UNDER_SERVICE":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
};

const Inventory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canCreate } = usePermissions();

  // Modals
  const [showDealersModal, setShowDealersModal] = useState(false);
  const [showReceivingSlipModal, setShowReceivingSlipModal] = useState(false);
  const [selectedRetroItem, setSelectedRetroItem] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [searchIn, setSearchIn] = useState(searchParams.get("search_in") || "");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1
  );
  const [limit, setLimit] = useState(
    Number(searchParams.get("limit")) || 10
  );
  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "",
    category: searchParams.get("category") || "",
  });

  const filterRef = useRef(null);

  // Fetch Inventory Query
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useGetInventoryItemsQuery({
    search: searchTerm,
    status: filters.status || undefined,
    page: currentPage,
    limit,
  });

  const items = response?.items || [];
  const pagination = response?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  const handleViewItem = (itemId) => {
    navigate(`${ROUTES.INVENTORY}/${itemId}`, {
      state: {
        from: location.pathname + location.search,
        label: "Inventory",
      },
    });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    updateURL({ currentPage: newPage });
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setCurrentPage(1);
    updateURL({
      limit: newLimit,
      currentPage: 1,
    });
  };

  const toggleFilter = () => {
    setShowFilters(!showFilters);
  };

  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
    setSearchIn(searchParams.get("search_in") || "");
    setCurrentPage(Number(searchParams.get("page")) || 1);
    setLimit(Number(searchParams.get("limit")) || 10);
    setFilters({
      status: searchParams.get("status") || "",
      category: searchParams.get("category") || "",
    });
  }, [location.search]);

  const updateURL = (newState) => {
    const params = {};
    const finalState = {
      filters,
      searchTerm,
      searchIn,
      currentPage,
      limit,
      ...newState,
    };

    Object.entries(finalState.filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });

    if (finalState.searchTerm) params.search = finalState.searchTerm;
    if (finalState.searchIn) params.search_in = finalState.searchIn;
    if (finalState.currentPage > 1) params.page = finalState.currentPage;
    if (finalState.limit && finalState.limit !== 10) params.limit = finalState.limit;

    setSearchParams(params);
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-3 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-3 sm:py-6">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-8">
          {/* Modern Filters & Search Bar Matching InvoiceList */}
          <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border mb-3 gap-2">
            <div className="flex items-center space-x-2">
              {/* Filter Dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={toggleFilter}
                  className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-md p-2 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  aria-label="Filter options"
                >
                  <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </button>

                {showFilters && (
                  <div className="absolute top-12 left-0 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl shadow-xl p-5 z-20 w-[320px] sm:w-[340px] space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-2">
                      <h3 className="text-xs font-semibold text-gray-800 dark:text-slate-100">
                        Inventory Filters
                      </h3>
                      <button
                        onClick={() => {
                          const resetFilters = { status: "", category: "" };
                          setFilters(resetFilters);
                          setCurrentPage(1);
                          updateURL({ filters: resetFilters, currentPage: 1 });
                        }}
                        className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-medium"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="text-xs text-ink-muted dark:text-slate-400 font-medium">
                        Unit Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newFilters = { ...filters, status: val };
                          setFilters(newFilters);
                          setCurrentPage(1);
                          updateURL({ filters: newFilters, currentPage: 1 });
                        }}
                        className="w-full mt-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">All Statuses</option>
                        <option value="IN_STOCK">In Stock (Available)</option>
                        <option value="SOLD">Sold (Invoiced)</option>
                        <option value="DEFECTIVE_RMA">Defective RMA</option>
                        <option value="RETURNED">Returned</option>
                        <option value="UNDER_SERVICE">Under Service</option>
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label className="text-xs text-ink-muted dark:text-slate-400 font-medium">
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newFilters = { ...filters, category: val };
                          setFilters(newFilters);
                          setCurrentPage(1);
                          updateURL({ filters: newFilters, currentPage: 1 });
                        }}
                        className="w-full mt-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">All Categories</option>
                        <option value="BATTERY">Battery</option>
                        <option value="INVERTER">Inverter</option>
                        <option value="UPS">UPS</option>
                        <option value="SOLAR_PANEL">Solar Panel</option>
                        <option value="CHARGER">Charger</option>
                        <option value="ACCESSORIES">Accessories</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Modern Search Bar */}
              <div className="flex items-center space-x-3 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-input rounded-full px-4 py-1.5 max-w-xs shadow-sm">
                <Search className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                <input
                  placeholder="Search serial #, product..."
                  className="bg-transparent focus:outline-none text-ink-base dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 w-full text-xs"
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    setCurrentPage(1);
                    updateURL({ searchTerm: value, currentPage: 1 });
                  }}
                />
              </div>
            </div>

            {/* Action Buttons Matching InvoiceList */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDealersModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-200 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Suppliers</span>
              </button>

              {canCreate("products") && (
                <button
                  type="button"
                  onClick={() => setShowReceivingSlipModal(true)}
                  className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-dark-input border-2 border-blue-500 text-blue-500 dark:text-blue-400 rounded-md text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-600 hover:text-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Stock</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-3 px-1">
            {filters.status && (
              <Chip
                label={`Status: ${filters.status.replace("_", " ")}`}
                onRemove={() => {
                  const newFilters = { ...filters, status: "" };
                  setFilters(newFilters);
                  setCurrentPage(1);
                  updateURL({ filters: newFilters, currentPage: 1 });
                }}
              />
            )}

            {filters.category && (
              <Chip
                label={`Category: ${filters.category.replace("_", " ")}`}
                onRemove={() => {
                  const newFilters = { ...filters, category: "" };
                  setFilters(newFilters);
                  setCurrentPage(1);
                  updateURL({ filters: newFilters, currentPage: 1 });
                }}
              />
            )}
          </div>

          {/* Inventory Item List Card */}
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
            {error ? (
              <div className="p-6 text-center">
                <div className="text-red-600 dark:text-red-400 text-sm">
                  Failed to load inventory items. Please try again.
                </div>
                <Button onClick={refetch} className="mt-4">
                  Retry
                </Button>
              </div>
            ) : !items?.length ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-base font-medium text-ink-base dark:text-slate-100 mb-2">
                  No inventory items found
                </h3>
                <p className="text-ink-secondary dark:text-slate-400 mb-3 text-xs">
                  {searchTerm || filters.status
                    ? "No inventory units match your search criteria."
                    : "Get started by adding received stock items."}
                </p>
                <div className="flex items-center justify-center">
                  {canCreate("products") && (
                    <Button onClick={() => setShowReceivingSlipModal(true)}>
                      <Plus className="w-4 h-4 mr-1.5" /> Add First Stock
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Desktop Table Header Matching InvoiceList */}
                <div className="hidden md:grid grid-cols-[60px_2.2fr_1.4fr_1.4fr_120px] gap-2 text-gray-500 dark:text-slate-400 text-xs font-semibold bg-gray-200 dark:bg-dark-subtle p-4 rounded-t-lg">
                  <div>S No.</div>
                  <div>Product & Serial Details</div>
                  <div>Supplier / Origin</div>
                  <div>Status & Purchase Cost</div>
                  <div>Actions</div>
                </div>

                {/* Rows List */}
                {items.map((item, index) => {
                  const serialDisplay = item.serial_number || "NO SERIAL (LEGACY)";
                  const supplierName = item.dealer_id?.name || "No Supplier Linked";

                  return (
                    <div
                      key={item._id}
                      className={
                        index % 2 === 0
                          ? "bg-white dark:bg-dark-card"
                          : "bg-gray-50 dark:bg-dark-subtle"
                      }
                    >
                      {/* ── Compact Mobile Card (Touch-First Design Matching InvoiceList) ── */}
                      <div
                        className={`md:hidden relative px-3 py-2.5 transition-all active:bg-blue-50/40 dark:active:bg-slate-800/60 border-b border-gray-100 dark:border-dark-border/80 last:border-b-0 cursor-pointer ${
                          index % 2 === 0
                            ? "bg-white dark:bg-dark-card"
                            : "bg-slate-50/60 dark:bg-slate-800/25"
                        }`}
                        onClick={() => handleViewItem(item._id)}
                      >
                        {/* Left status accent indicator */}
                        <div
                          className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${
                            item.status === "SOLD"
                              ? "bg-blue-500"
                              : item.status === "DEFECTIVE_RMA" || item.status === "DEFECTIVE"
                              ? "bg-red-500"
                              : item.status === "RETURNED"
                              ? "bg-amber-500"
                              : item.status === "UNDER_SERVICE"
                              ? "bg-purple-500"
                              : "bg-emerald-500"
                          }`}
                        />

                        <div className="pl-1.5">
                          {/* Top Row: Product Name & Purchase Price */}
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-bold text-xs text-ink-base dark:text-slate-100 truncate hover:text-blue-600 dark:hover:text-blue-400">
                              {item.product_name}
                            </p>
                            <span className="text-xs font-bold text-ink-base dark:text-white shrink-0 tracking-tight">
                              {formatCurrency(item.purchase_price)}
                            </span>
                          </div>

                          {/* Meta Row: S/N · Purchase Date · Supplier */}
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 dark:text-slate-400 flex-wrap">
                            <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400 break-all">
                              {serialDisplay}
                            </span>
                            {item.purchase_date && (
                              <>
                                <span>·</span>
                                <span>{formatDate(item.purchase_date)}</span>
                              </>
                            )}
                            {item.dealer_id?.name && (
                              <>
                                <span>·</span>
                                <span className="truncate max-w-[120px]">
                                  {item.dealer_id.name}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Sales or Invoice Ref Single-Line Summary */}
                          {item.invoice_id && (
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                              <span className="shrink-0 px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-900/30 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                Sold Inv #{item.invoice_id.invoice_number}
                              </span>
                              {item.invoice_id.customer_name && (
                                <span className="truncate text-slate-600 dark:text-slate-400">
                                  {item.invoice_id.customer_name}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Bottom Status & Action Row */}
                          <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-dark-border/40">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[9.5px] px-2 py-0.5 rounded-full font-semibold tracking-wide ${getStatusBadgeClass(
                                  item.status
                                )}`}
                              >
                                {item.status ? item.status.replace("_", " ") : "IN STOCK"}
                              </span>

                              {item.purchase_invoice_ref && (
                                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-mono break-all">
                                  Ref: {item.purchase_invoice_ref}
                                </span>
                              )}
                            </div>

                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="px-2.5 py-1 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 active:scale-95 transition-all flex items-center gap-1 text-[11px] font-semibold"
                                onClick={() => handleViewItem(item._id)}
                                aria-label="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Desktop Row Matching InvoiceList ── */}
                      <div className="hidden md:grid grid-cols-[60px_2.2fr_1.4fr_1.4fr_120px] gap-2 items-center p-4">
                        {/* S No. */}
                        <div className="text-ink-secondary dark:text-slate-400">
                          {(currentPage - 1) * limit + index + 1}
                        </div>

                        {/* Product & Serial Details */}
                        <div className="flex gap-3 items-center min-w-0">
                          <div
                            className="cursor-pointer shrink-0"
                            onClick={() => handleViewItem(item._id)}
                          >
                            <div className="w-10 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div
                              className="font-bold text-sm text-ink-base dark:text-slate-100 cursor-pointer hover:underline truncate"
                              onClick={() => handleViewItem(item._id)}
                            >
                              {item.product_name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-ink-secondary dark:text-slate-400 mt-0.5 flex-wrap">
                              <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400 break-all">
                                {serialDisplay}
                              </span>
                              <span>·</span>
                              <span>
                                {item.product_id?.category || item.product_id?.product_category || "Unit"}
                              </span>
                              {item.purchase_date && (
                                <>
                                  <span>·</span>
                                  <span>{formatDate(item.purchase_date)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Supplier / Origin Column */}
                        <div className="text-xs text-ink-secondary dark:text-slate-400 min-w-0">
                          {item.dealer_id ? (
                            <div>
                              <div
                                className="font-semibold text-gray-900 dark:text-slate-100 truncate hover:text-blue-600 cursor-pointer"
                                onClick={() => handleViewItem(item._id)}
                              >
                                {item.dealer_id.name}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                                {item.dealer_id.phone || item.purchase_invoice_ref || "Direct Supplier"}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs italic">
                              <span>No Supplier Linked</span>
                            </div>
                          )}
                        </div>

                        {/* Status & Purchase Column */}
                        <div className="text-ink-secondary dark:text-slate-400">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-900 dark:text-slate-100">
                                {formatCurrency(item.purchase_price)}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 font-medium rounded-full ${getStatusBadgeClass(
                                  item.status
                                )}`}
                              >
                                {item.status ? item.status.replace("_", " ") : "IN STOCK"}
                              </span>
                            </div>
                            {item.invoice_id && (
                              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                                Invoiced #{item.invoice_id.invoice_number}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions Column */}
                        <div>
                          <button
                            className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1"
                            onClick={() => handleViewItem(item._id)}
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Footer Matching InvoiceList */}
            {pagination.total > 0 && (
              <div className="px-4 sm:px-3 py-2 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input rounded-b-lg">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs text-ink-muted dark:text-slate-400">
                    <span>
                      Showing {(currentPage - 1) * limit + 1} to{" "}
                      {Math.min(currentPage * limit, pagination.total)} of{" "}
                      {pagination.total} items
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>Rows per page:</span>
                      <select
                        value={limit}
                        onChange={(e) => handleLimitChange(Number(e.target.value))}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-input text-ink-base dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  {pagination.pages > 1 && (
                    <div className="flex items-center space-x-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="p-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {Array.from(
                        { length: Math.min(5, pagination.pages) },
                        (_, i) => {
                          let pageNum;
                          if (pagination.pages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= pagination.pages - 2) {
                            pageNum = pagination.pages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                                currentPage === pageNum
                                  ? "bg-blue-600 text-white"
                                  : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-dark-hover"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}

                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= pagination.pages}
                        className="p-1"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
        onClose={() => {
          setSelectedRetroItem(null);
          refetch();
        }}
        item={selectedRetroItem}
      />
    </>
  );
};

export default Inventory;
