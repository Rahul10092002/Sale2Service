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
} from "lucide-react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
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
    setPage(newPage);
    updateURL({ page: newPage });
  };

  const toggleFilter = () => setShowFilters(!showFilters);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-dark-card p-5 rounded-2xl shadow-xs border border-gray-200 dark:border-dark-border">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-7 h-7 text-blue-600" /> Inventory & Supplier Tracking
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Manage physical unit stock intake, serial numbers, supplier origins, and warranty claims
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDealersModal(true)}
              className="flex items-center gap-1.5 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              <Building2 className="w-4 h-4 text-blue-600" /> Suppliers / Dealers
            </Button>

            <Button
              size="sm"
              onClick={() => setShowReceivingSlipModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" /> Receiving Slip (Add Stock)
            </Button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-white dark:bg-dark-card rounded-lg shadow-xs border border-gray-200 dark:border-dark-border gap-2">
          <div className="flex items-center space-x-2">
            <div className="relative" ref={filterRef}>
              <button
                onClick={toggleFilter}
                className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-md p-2 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Filter className="h-4 w-4 text-blue-600" />
              </button>

              {showFilters && (
                <div className="absolute top-12 left-0 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl shadow-xl p-5 z-20 w-[300px] space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-xs font-semibold text-gray-800 dark:text-slate-100">Filters</h3>
                    <button
                      onClick={() => {
                        setCategory("");
                        setStockStatus("");
                        updateURL({ category: "", stockStatus: "", page: 1 });
                      }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      Reset All
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        updateURL({ category: e.target.value, page: 1 });
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-card text-gray-900 dark:text-slate-100"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Stock Status</label>
                    <select
                      value={stockStatus}
                      onChange={(e) => {
                        setStockStatus(e.target.value);
                        updateURL({ stockStatus: e.target.value, page: 1 });
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-card text-gray-900 dark:text-slate-100"
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

            <div className="relative">
              <input
                type="text"
                placeholder="Search by Serial # or Product..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  updateURL({ search: e.target.value, page: 1 });
                }}
                className="pl-8 pr-4 py-1.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-md text-xs text-gray-900 dark:text-slate-100 w-48 sm:w-64 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* SERIAL & UNIT INVENTORY TABLE */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-xs border border-gray-200 dark:border-dark-border overflow-hidden">
          {isLoadingUnits ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner />
            </div>
          ) : unitItems.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Unit Inventory Records</p>
              <p className="text-xs text-gray-400 mt-1">Use "Receiving Slip" to intake serial-tracked stock from suppliers.</p>
            </div>
          ) : (
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
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            item.status === "IN_STOCK"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : item.status === "SOLD"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                              : item.status === "DEFECTIVE_RMA"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
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
                              {new Date(item.purchase_date).toLocaleDateString()}
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
