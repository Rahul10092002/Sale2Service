import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Package,
  Plus,
  Trash2,
  Edit,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Button, LoadingSpinner } from "../../components/ui/index.js";
import {
  useGetInventoryProductsQuery,
  useDeleteInventoryProductMutation,
} from "../../features/products/productApi.js";
import { ROUTES } from "../../utils/constants.js";
import MasterProductModal from "./MasterProductModal.jsx";

const Chip = ({ label, onRemove }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-200 dark:border-blue-800">
      {label}
      <button
        onClick={onRemove}
        className="text-blue-500 dark:text-blue-400 hover:text-red-500 dark:hover:text-red-400"
      >
        ✕
      </button>
    </div>
  );
};

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
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [stockStatus, setStockStatus] = useState(searchParams.get("stockStatus") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: response, isLoading, isFetching } = useGetInventoryProductsQuery({
    search: searchTerm,
    category,
    stockStatus,
    page,
    limit: 10, // Matching InvoiceList limit
  });

  const [deleteProduct, { isLoading: isDeleting }] = useDeleteInventoryProductMutation();

  const products = response?.products || [];
  const pagination = response?.pagination || { page: 1, pages: 1, total: 0 };

  // Update URL function
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

  // Sync state with URL params
  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
    setCategory(searchParams.get("category") || "");
    setStockStatus(searchParams.get("stockStatus") || "");
    setPage(Number(searchParams.get("page")) || 1);
  }, [location.search]);

  // Handle outside clicks for filter dropdown
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

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this product from inventory?")) {
      try {
        await deleteProduct(id).unwrap();
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    setShowModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modern Filters & Search */}
        <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border mb-3 gap-2">
          <div className="flex items-center space-x-2">
            {/* Filter Toggle */}
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
                      Clear All
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-tighter">Category</label>
                    <select
                      value={category}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCategory(val);
                        updateURL({ category: val, page: 1 });
                      }}
                      className="w-full mt-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-tighter">Stock Status</label>
                    <select
                      value={stockStatus}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStockStatus(val);
                        updateURL({ stockStatus: val, page: 1 });
                      }}
                      className="w-full mt-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">All Stock</option>
                      <option value="low">Low Stock</option>
                      <option value="in_stock">In Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-dark-border hidden sm:block"></div>

            {/* Search Bar */}
            <div className="flex items-center space-x-3 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-input rounded-full px-4 py-1.5 max-w-xs shadow-sm">
              <Search className="h-4 w-4 text-gray-500 dark:text-slate-400" />
              <input
                placeholder="Search products..."
                className="bg-transparent focus:outline-none text-ink-base dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 w-full text-xs"
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  updateURL({ search: val, page: 1 });
                }}
              />
            </div>
          </div>

          <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-dark-input border-2 border-blue-500 text-blue-500 dark:text-blue-400 rounded-md text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-600 transition-all shadow-sm">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        {/* Active Filter Chips */}
        {(category || stockStatus) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {category && (
              <Chip
                label={`Category: ${CATEGORY_OPTIONS.find(c => c.value === category)?.label}`}
                onRemove={() => {
                  setCategory("");
                  updateURL({ category: "", page: 1 });
                }}
              />
            )}
            {stockStatus && (
              <Chip
                label={`Stock: ${stockStatus === "low" ? "Low Stock" : stockStatus === "in_stock" ? "In Stock" : "Out of Stock"}`}
                onRemove={() => {
                  setStockStatus("");
                  updateURL({ stockStatus: "", page: 1 });
                }}
              />
            )}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-500">Loading catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base font-medium text-ink-base dark:text-slate-100 mb-2">
              No products found
            </h3>
            <p className="text-ink-secondary dark:text-slate-400 mb-3 mx-auto max-w-xs">
              {searchTerm || category
                ? "No products match your search or category."
                : "Get started by adding your first product to the catalog."}
            </p>
              <div className="flex items-center justify-center">
                <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-dark-input border-2 border-blue-500 text-blue-500 dark:text-blue-400 rounded-md text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-600 hover:text-blue-600">
                                <Plus className="w-4 h-4" />
                                Add New Product
                              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-[60px_2fr_1fr_1fr_1fr_120px] gap-2 text-gray-500 dark:text-slate-400 text-xs font-semibold bg-gray-200 dark:bg-dark-subtle p-4 rounded-t-lg">
              <div>S No.</div>
              <div>Product Details</div>
              <div>Specifications</div>
              <div>Pricing</div>
              <div>Stock</div>
              <div>Actions</div>
            </div>
            {/* Rows */}
            <div className="">
              {products.map((product, index) => (
                <div
                  key={product._id}
                  className={
                    index % 2 === 0
                      ? "bg-white dark:bg-dark-card"
                      : "bg-gray-50 dark:bg-dark-subtle"
                  }
                >
                  {/* Mobile View */}
                  <div className="md:hidden p-4 border-b border-gray-100 dark:border-dark-border last:border-b-0">
                    <div className="flex gap-4 items-start mb-3">
                      <div className="w-11 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        {product.product_images?.[0] ? (
                          <img
                            src={product.product_images[0]}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-ink-base dark:text-slate-100 leading-tight truncate text-sm">
                            {product.product_name}
                          </p>
                        </div>
                        <div className="text-xs text-ink-secondary dark:text-slate-400 mt-0.5">
                          <p>{product.company} · {product.model_number}</p>
                          {product.battery_type && (
                            <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[10px] mt-0.5">
                              {product.battery_type.replace(/_/g, " ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg px-3 py-1.5">
                        <p className="text-[10px] text-ink-muted dark:text-slate-500 mb-0.5 uppercase tracking-tighter">
                          Selling Price
                        </p>
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-100">
                          {formatCurrency(product.selling_price)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-dark-subtle rounded-lg px-3 py-1.5">
                        <p className="text-[10px] text-ink-muted dark:text-slate-500 mb-0.5 uppercase tracking-tighter">
                          Stock Status
                        </p>
                        <p className={`text-xs font-bold ${
                          (product.stock_quantity || 0) <= (product.min_stock_alert || 0) 
                            ? "text-red-500" 
                            : "text-green-500"
                        }`}>
                          {product.stock_quantity || 0} In Stock
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-xs font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="w-4 h-4" /> Edit Details
                      </button>
                      <button
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20"
                        onClick={() => handleDelete(product._id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Desktop Row */}
                  <div className="hidden md:grid grid-cols-[60px_2fr_1fr_1fr_1fr_120px] gap-2 items-center p-4 hover:bg-indigo-50/10 dark:hover:bg-indigo-900/5 transition-colors">
                    <div className="text-xs text-ink-secondary dark:text-slate-400 font-mono">
                      {(page - 1) * 12 + index + 1}
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                        {product.product_images?.[0] ? (
                          <img
                            src={product.product_images[0]}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-ink-base dark:text-slate-100 truncate">
                          {product.product_name}
                        </p>
                        <div className="text-xs text-ink-secondary dark:text-slate-400">
                          <p>{product.company} · {product.model_number}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-ink-secondary dark:text-slate-400">
                      <div className="mb-1">
                        <span className="inline-flex px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-dark-subtle text-[10px] font-bold uppercase tracking-wider">
                          {product.product_category}
                        </span>
                      </div>
                      {product.battery_type && (
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                          {product.battery_type.replace(/_/g, " ")}
                        </p>
                      )}
                      <p>Warranty: {product.warranty_duration_months} M</p>
                    </div>
                    <div className="text-xs text-ink-secondary dark:text-slate-400">
                      <p className="font-bold text-ink-base dark:text-slate-100">{formatCurrency(product.selling_price)}</p>
                      {product.cost_price > 0 && (
                        <p className="opacity-60 text-[10px]">Cost: {formatCurrency(product.cost_price)}</p>
                      )}
                    </div>
                    <div className="text-xs">
                        <div className={`font-bold ${
                          (product.stock_quantity || 0) <= (product.min_stock_alert || 0) 
                            ? "text-red-500 bg-red-100 dark:bg-red-900/20" 
                            : "text-green-600 bg-green-100 dark:bg-green-900/20"
                        } px-2 py-1 rounded-full inline-block`}>
                          {product.stock_quantity || 0} Qty
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Min: {product.min_stock_alert || 0}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <button
                        onClick={() => handleEdit(product)}
                        className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                        title="Edit Product"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="bg-red-50 dark:bg-red-900/20 text-red-500 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination Section Matching InvoiceList */}
        {pagination.pages > 1 && (
          <div className="mt-4 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-dark-subtle/20">
              <div className="hidden sm:block">
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  Showing <span className="text-gray-900 dark:text-slate-200 font-bold">{(pagination.page - 1) * 10 + 1}</span> to{" "}
                  <span className="text-gray-900 dark:text-slate-200 font-bold">{Math.min(pagination.page * 10, pagination.total)}</span> of{" "}
                  <span className="text-gray-900 dark:text-slate-200 font-bold">{pagination.total}</span> products
                </p>
              </div>

              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => {
                    const showPage = 
                      pageNum === 1 || 
                      pageNum === pagination.pages || 
                      Math.abs(pageNum - pagination.page) <= 1;

                    if (!showPage) {
                      if (pageNum === pagination.page - 2 || pageNum === pagination.page + 2) {
                        return <span key={pageNum} className="px-2 py-1 text-xs text-gray-400">...</span>;
                      }
                      return null;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0 text-xs font-bold"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Simple pagination info when only 1 page */}
        {pagination.pages <= 1 && pagination.total > 0 && (
          <div className="mt-3 px-4 py-2 border border-gray-100 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card">
            <div className="text-[10px] text-gray-400 dark:text-slate-500 text-center uppercase tracking-widest font-bold">
              Total {pagination.total} products in catalog
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <MasterProductModal
          open={showModal}
          onClose={() => setShowModal(false)}
          product={selectedProduct}
        />
      )}
    </div>
  );
};

export default Inventory;
