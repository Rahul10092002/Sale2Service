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
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Edit3,
  Copy,
  Receipt,
  Boxes,
} from "lucide-react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button, LoadingSpinner, ImageGalleryModal } from "../../components/ui/index.js";
import { useGetPurchasesQuery } from "../../features/inventory/inventoryApi.js";
import { useGetDealersQuery } from "../../features/dealers/dealerApi.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { ROUTES } from "../../utils/constants.js";
import { formatDate } from "../../utils/date.js";
import DealersModal from "./DealersModal.jsx";
import ReceivingSlipModal from "./ReceivingSlipModal.jsx";
import EditReceivingSlipModal from "./EditReceivingSlipModal.jsx";
import RetroactiveDealerModal from "./RetroactiveDealerModal.jsx";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";

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

const Purchases = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canCreate } = usePermissions();

  // Modals state
  const [showDealersModal, setShowDealersModal] = useState(false);
  const [showReceivingSlipModal, setShowReceivingSlipModal] = useState(false);
  const [selectedEditSlipId, setSelectedEditSlipId] = useState(null);
  const [selectedRetroItem, setSelectedRetroItem] = useState(null);
  const [expandedSlipSerials, setExpandedSlipSerials] = useState({});

  // Image Gallery State
  const [galleryConfig, setGalleryConfig] = useState({
    isOpen: false,
    images: [],
    title: "Purchase Bill Images",
    initialIndex: 0,
  });

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1
  );
  const [limit, setLimit] = useState(
    Number(searchParams.get("limit")) || 10
  );
  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "",
    dealer_id: searchParams.get("dealer_id") || "",
  });

  const filterRef = useRef(null);

  // Fetch Dealers for filter dropdown
  const { data: dealersResp } = useGetDealersQuery();
  const dealersList = dealersResp?.dealers || [];

  // Fetch Grouped Purchases Query
  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetPurchasesQuery({
    search: searchTerm,
    status: filters.status || undefined,
    dealer_id: filters.dealer_id || undefined,
    page: currentPage,
    limit,
  });

  const purchases = response?.purchases || [];
  const pagination = response?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  const handleViewSlip = (purchase) => {
    // If slip has a representative item ID, navigate to item view with context, or purchase order id
    const targetId = purchase.first_item_id || purchase._id || purchase.purchase_order_id;
    navigate(`${ROUTES.INVENTORY}/${targetId}`, {
      state: {
        from: location.pathname + location.search,
        label: "Purchases",
        slipId: purchase.purchase_order_id || purchase._id,
      },
    });
  };

  const handleCopySerial = (e, serial) => {
    e.stopPropagation();
    navigator.clipboard.writeText(serial);
    dispatch(showToast({ type: "success", message: `Serial ${serial} copied!` }));
  };

  const toggleSerialExpansion = (e, slipId) => {
    e.stopPropagation();
    setExpandedSlipSerials((prev) => ({
      ...prev,
      [slipId]: !prev[slipId],
    }));
  };

  const openGallery = (e, images, title) => {
    e.stopPropagation();
    const validImages = Array.isArray(images) ? images.filter(Boolean) : [images].filter(Boolean);
    if (validImages.length === 0) return;
    setGalleryConfig({
      isOpen: true,
      images: validImages,
      title: title || "Purchase Bill",
      initialIndex: 0,
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
    setCurrentPage(Number(searchParams.get("page")) || 1);
    setLimit(Number(searchParams.get("limit")) || 10);
    setFilters({
      status: searchParams.get("status") || "",
      dealer_id: searchParams.get("dealer_id") || "",
    });
  }, [location.search]);

  const updateURL = (newState) => {
    const params = {};
    const finalState = {
      filters,
      searchTerm,
      currentPage,
      limit,
      ...newState,
    };

    Object.entries(finalState.filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });

    if (finalState.searchTerm) params.search = finalState.searchTerm;
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
          {/* Top Bar: Title & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">
                  Purchases & Inward
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {pagination.total} Slip{pagination.total === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Manage supplier bills, product inward batches, and warranty origins
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowDealersModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover active:scale-95 transition-all shadow-xs"
              >
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Suppliers & Dealers</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReceivingSlipModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl active:scale-95 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Purchase Intake</span>
              </button>
            </div>
          </div>

          {/* Modern Filters & Search Bar */}
          <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-white dark:bg-dark-card rounded-xl shadow-xs border border-gray-200 dark:border-dark-border mb-3 gap-2">
            <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
              {/* Filter Dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={toggleFilter}
                  className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  aria-label="Filter options"
                >
                  <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </button>

                {showFilters && (
                  <div className="absolute top-12 left-0 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl shadow-2xl p-5 z-30 w-[320px] sm:w-[360px] space-y-4 animate-in fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-2">
                      <h3 className="text-xs font-bold text-gray-800 dark:text-slate-100 uppercase tracking-wide">
                        Purchase Filters
                      </h3>
                      <button
                        onClick={() => {
                          const resetFilters = { status: "", dealer_id: "" };
                          setFilters(resetFilters);
                          setCurrentPage(1);
                          updateURL({ filters: resetFilters, currentPage: 1 });
                        }}
                        className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-semibold"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Dealer Filter */}
                    <div>
                      <label className="text-xs text-ink-muted dark:text-slate-400 font-semibold">
                        Supplier / Dealer
                      </label>
                      <select
                        value={filters.dealer_id}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newFilters = { ...filters, dealer_id: val };
                          setFilters(newFilters);
                          setCurrentPage(1);
                          updateURL({ filters: newFilters, currentPage: 1 });
                        }}
                        className="w-full mt-1 px-3 py-2 text-xs border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-ink-base dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      >
                        <option value="">All Suppliers</option>
                        {dealersList.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="text-xs text-ink-muted dark:text-slate-400 font-semibold">
                        Stock Status In Purchase
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
                        className="w-full mt-1 px-3 py-2 text-xs border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-input text-ink-base dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      >
                        <option value="">All Slips</option>
                        <option value="IN_STOCK">Has In-Stock Units</option>
                        <option value="SOLD">Has Invoiced/Sold Units</option>
                        <option value="DEFECTIVE_RMA">Has Defective RMA</option>
                        <option value="RETURNED">Has Returned Units</option>
                        <option value="UNDER_SERVICE">Has Units Under Service</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Modern Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    updateURL({ searchTerm: e.target.value, currentPage: 1 });
                  }}
                  placeholder="Search serial numbers, bill #, product names, or supplier..."
                  className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 dark:border-dark-border rounded-xl bg-gray-50/50 dark:bg-dark-input text-ink-base dark:text-slate-200 focus:bg-white dark:focus:bg-dark-input focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      updateURL({ searchTerm: "", currentPage: 1 });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Clear All active chips button if filters applied */}
            {(filters.status || filters.dealer_id || searchTerm) && (
              <button
                onClick={() => {
                  const resetFilters = { status: "", dealer_id: "" };
                  setFilters(resetFilters);
                  setSearchTerm("");
                  setCurrentPage(1);
                  updateURL({ filters: resetFilters, searchTerm: "", currentPage: 1 });
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Reset Search
              </button>
            )}
          </div>

          {/* Active Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {searchTerm && (
              <Chip
                label={`Search: "${searchTerm}"`}
                onRemove={() => {
                  setSearchTerm("");
                  updateURL({ searchTerm: "", currentPage: 1 });
                }}
              />
            )}
            {filters.status && (
              <Chip
                label={`Status: ${filters.status}`}
                onRemove={() => {
                  const newFilters = { ...filters, status: "" };
                  setFilters(newFilters);
                  updateURL({ filters: newFilters, currentPage: 1 });
                }}
              />
            )}
            {filters.dealer_id && (
              <Chip
                label={`Supplier: ${
                  dealersList.find((d) => d._id === filters.dealer_id)?.name || "Selected"
                }`}
                onRemove={() => {
                  const newFilters = { ...filters, dealer_id: "" };
                  setFilters(newFilters);
                  updateURL({ filters: newFilters, currentPage: 1 });
                }}
              />
            )}
          </div>

          {/* Main Table / Card Container */}
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xs border border-gray-200 dark:border-dark-border overflow-hidden">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-[50px_1.8fr_1.6fr_1.8fr_1.4fr_140px] gap-2 items-center px-4 py-3 bg-gray-50/80 dark:bg-dark-input/60 border-b border-gray-200 dark:border-dark-border text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
              <div>#</div>
              <div>Purchase Slip & Date</div>
              <div>Supplier / Origin</div>
              <div>Products & Serials</div>
              <div>Cost & Status</div>
              <div className="text-right">Actions</div>
            </div>

            {/* Empty State */}
            {purchases.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600 dark:text-blue-400">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-1">
                  No purchases found
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
                  {searchTerm || filters.status || filters.dealer_id
                    ? "Try adjusting your search terms or clearing your filters."
                    : "Enter your first receiving slip to track product purchases and warranty origins."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowReceivingSlipModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Purchase Intake</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-dark-border">
                {purchases.map((purchase, index) => {
                  const slipImages = purchase.purchase_bill_images?.length > 0
                    ? purchase.purchase_bill_images
                    : purchase.purchase_bill_image
                    ? [purchase.purchase_bill_image]
                    : [];

                  const isExpanded = expandedSlipSerials[purchase._id];
                  const totalSerials = purchase.serial_numbers || [];
                  const displayedSerials = isExpanded ? totalSerials : totalSerials.slice(0, 3);
                  const remainingSerials = totalSerials.length - 3;

                  return (
                    <div
                      key={purchase._id}
                      className="hover:bg-blue-50/30 dark:hover:bg-dark-hover transition-colors"
                    >
                      {/* ── Mobile Card View (< md) ── */}
                      <div className="p-3.5 md:hidden space-y-3">
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-extrabold text-sm text-gray-900 dark:text-slate-100 flex items-center gap-1.5 font-mono">
                                {purchase.dealer_invoice_no || "INTAKE SLIP"}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(purchase.purchase_date)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-extrabold text-sm text-gray-900 dark:text-slate-100">
                              {formatCurrency(purchase.total_cost)}
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/40">
                              {purchase.total_items_count} Unit{purchase.total_items_count === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>

                        {/* Supplier Row */}
                        <div className="p-2.5 bg-gray-50 dark:bg-dark-input/60 rounded-xl border border-gray-100 dark:border-dark-border text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-gray-800 dark:text-slate-200">
                                {purchase.dealer?.name || "Direct Supplier"}
                              </span>
                              {purchase.dealer?.phone && (
                                <span className="text-[11px] text-gray-500 dark:text-slate-400 font-mono ml-2">
                                  {purchase.dealer.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          {slipImages.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => openGallery(e, slipImages, `Bill #${purchase.dealer_invoice_no}`)}
                              className="p-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1 shrink-0"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Bill ({slipImages.length})</span>
                            </button>
                          )}
                        </div>

                        {/* Products List Summary */}
                        <div className="space-y-1">
                          {purchase.products_summary?.map((prod, pIdx) => (
                            <div key={pIdx} className="flex justify-between items-center text-xs">
                              <span className="font-medium text-gray-700 dark:text-slate-300 truncate max-w-[200px]">
                                {prod.product_name}
                              </span>
                              <span className="font-bold text-gray-900 dark:text-white shrink-0 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                                {prod.count} {prod.count === 1 ? "unit" : "units"}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Serials Preview */}
                        {totalSerials.length > 0 && (
                          <div className="pt-1">
                            <div className="flex flex-wrap gap-1 items-center">
                              {displayedSerials.map((sn, sIdx) => (
                                <span
                                  key={sIdx}
                                  onClick={(e) => handleCopySerial(e, sn)}
                                  className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 active:scale-95 cursor-pointer"
                                  title="Click to copy serial"
                                >
                                  {sn}
                                  <Copy className="w-2.5 h-2.5 opacity-60" />
                                </span>
                              ))}
                              {remainingSerials > 0 && !isExpanded && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleSerialExpansion(e, purchase._id)}
                                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-1"
                                >
                                  +{remainingSerials} more...
                                </button>
                              )}
                              {isExpanded && remainingSerials > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleSerialExpansion(e, purchase._id)}
                                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-1"
                                >
                                  Show less
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Actions Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-dark-border gap-2">
                          <div className="flex items-center gap-2 text-[11px]">
                            {purchase.status_breakdown?.IN_STOCK > 0 && (
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                {purchase.status_breakdown.IN_STOCK} In Stock
                              </span>
                            )}
                            {purchase.status_breakdown?.SOLD > 0 && (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                · {purchase.status_breakdown.SOLD} Sold
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedEditSlipId(purchase._id || purchase.purchase_order_id)}
                              className="px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewSlip(purchase)}
                              className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg active:scale-95 transition-all flex items-center gap-1 shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Slip</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ── Desktop Row View (>= md) ── */}
                      <div className="hidden md:grid grid-cols-[50px_1.8fr_1.6fr_1.8fr_1.4fr_140px] gap-2 items-center p-4">
                        {/* S No */}
                        <div className="text-xs font-semibold text-gray-400 dark:text-slate-500">
                          {(currentPage - 1) * limit + index + 1}
                        </div>

                        {/* Slip Info & Date */}
                        <div className="min-w-0">
                          <div
                            className="font-mono font-extrabold text-sm text-gray-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer flex items-center gap-1.5 truncate"
                            onClick={() => handleViewSlip(purchase)}
                          >
                            <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="truncate">{purchase.dealer_invoice_no || "INTAKE SLIP"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-1">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatDate(purchase.purchase_date)}</span>
                            {slipImages.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => openGallery(e, slipImages, `Bill #${purchase.dealer_invoice_no}`)}
                                className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5 ml-1"
                              >
                                <ImageIcon className="w-3 h-3" />
                                <span>Bill ({slipImages.length})</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Supplier / Origin */}
                        <div className="min-w-0 text-xs">
                          {purchase.dealer ? (
                            <div>
                              <div
                                className="font-bold text-gray-900 dark:text-slate-100 truncate hover:text-blue-600 cursor-pointer"
                                onClick={() => handleViewSlip(purchase)}
                              >
                                {purchase.dealer.name}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                                {purchase.dealer.phone || purchase.dealer.contact_person || "Supplier"}
                              </div>
                            </div>
                          ) : (
                            <div className="text-amber-600 dark:text-amber-400 italic text-xs">
                              Direct / Unassigned
                            </div>
                          )}
                        </div>

                        {/* Products & Serials */}
                        <div className="min-w-0 space-y-1">
                          {purchase.products_summary?.map((prod, pIdx) => (
                            <div key={pIdx} className="text-xs text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                              <span className="font-semibold truncate max-w-[150px]">{prod.product_name}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-gray-700 dark:text-slate-300 shrink-0">
                                x{prod.count}
                              </span>
                            </div>
                          ))}

                          {/* Serials Chips Preview */}
                          {totalSerials.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-center pt-0.5">
                              {displayedSerials.map((sn, sIdx) => (
                                <span
                                  key={sIdx}
                                  onClick={(e) => handleCopySerial(e, sn)}
                                  className="font-mono text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-0.5 cursor-pointer hover:bg-indigo-100"
                                  title="Click to copy serial"
                                >
                                  {sn}
                                </span>
                              ))}
                              {remainingSerials > 0 && !isExpanded && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleSerialExpansion(e, purchase._id)}
                                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  +{remainingSerials} more...
                                </button>
                              )}
                              {isExpanded && remainingSerials > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleSerialExpansion(e, purchase._id)}
                                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  Show less
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Total Cost & Status */}
                        <div className="min-w-0 text-xs">
                          <div className="font-extrabold text-sm text-gray-900 dark:text-slate-100">
                            {formatCurrency(purchase.total_cost)}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {purchase.total_items_count} Units
                            </span>
                            {purchase.status_breakdown?.IN_STOCK > 0 && (
                              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                {purchase.status_breakdown.IN_STOCK} in stock
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedEditSlipId(purchase._id || purchase.purchase_order_id)}
                            className="p-1.5 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg active:scale-95 transition-all"
                            title="Edit Receiving Slip"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewSlip(purchase)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Slip</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Footer */}
            {pagination.total > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-border bg-gray-50/70 dark:bg-dark-input/60 rounded-b-2xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                    <span>
                      Showing {(currentPage - 1) * limit + 1} to{" "}
                      {Math.min(currentPage * limit, pagination.total)} of{" "}
                      {pagination.total} purchase slips
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>Per page:</span>
                      <select
                        value={limit}
                        onChange={(e) => handleLimitChange(Number(e.target.value))}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  {pagination.pages > 1 && (
                    <div className="flex items-center space-x-1">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="p-1.5 rounded-lg"
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
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                                currentPage === pageNum
                                  ? "bg-blue-600 text-white shadow-xs"
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
                        className="p-1.5 rounded-lg"
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
        onClose={() => {
          setShowReceivingSlipModal(false);
          refetch();
        }}
        onOpenDealers={() => {
          setShowReceivingSlipModal(false);
          setShowDealersModal(true);
        }}
      />

      {selectedEditSlipId && (
        <EditReceivingSlipModal
          isOpen={Boolean(selectedEditSlipId)}
          onClose={() => {
            setSelectedEditSlipId(null);
            refetch();
          }}
          slipId={selectedEditSlipId}
        />
      )}

      <RetroactiveDealerModal
        isOpen={Boolean(selectedRetroItem)}
        onClose={() => {
          setSelectedRetroItem(null);
          refetch();
        }}
        item={selectedRetroItem}
      />

      {/* Bill Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={galleryConfig.isOpen}
        onClose={() => setGalleryConfig((prev) => ({ ...prev, isOpen: false }))}
        images={galleryConfig.images}
        title={galleryConfig.title}
        initialIndex={galleryConfig.initialIndex}
      />
    </>
  );
};

export default Purchases;
