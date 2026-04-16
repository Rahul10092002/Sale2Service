import React, { useState, useMemo } from "react";
import {
  Search,
  Package,
  Plus,
  Table as TableIcon,
  Trash2,
  Edit,
  Grid,
  List,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Camera,
  Layers,
} from "lucide-react";
import { Button, Input, LoadingSpinner } from "../../components/ui/index.js";
import {
  useGetInventoryProductsQuery,
  useDeleteInventoryProductMutation,
} from "../../features/products/productApi.js";
import { ROUTES, INVOICE_CONSTANTS } from "../../utils/constants.js";
import MasterProductModal from "./MasterProductModal.jsx";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: response, isLoading, isFetching } = useGetInventoryProductsQuery({
    search: searchTerm,
    category,
    page,
    limit: 12,
  });

  const [deleteProduct, { isLoading: isDeleting }] = useDeleteInventoryProductMutation();

  const products = response?.products || [];
  const pagination = response?.pagination || { page: 1, pages: 1, total: 0 };

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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <TableIcon className="w-6 h-6 text-indigo-600" />
              Inventory Catalog
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Manage product templates for faster invoice generation
            </p>
          </div>
          <Button onClick={handleAdd} className="flex font-semibold items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4" />
            Add New Product
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-dark-card p-3 rounded-xl shadow-sm border border-gray-200 dark:border-dark-border mb-6">
          <div className="flex flex-1 min-w-[280px] max-w-md items-center gap-2 bg-gray-50 dark:bg-dark-input rounded-lg px-3 py-1.5 border border-gray-200 dark:border-dark-border">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, company or model..."
              className="bg-transparent border-none focus:ring-0 text-sm w-full dark:text-slate-200"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-lg px-3 py-1.5 text-sm dark:text-slate-200"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-8 w-px bg-gray-200 dark:bg-dark-border hidden sm:block"></div>

            <div className="flex items-center bg-gray-100 dark:bg-dark-subtle rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "grid" ? "bg-white dark:bg-dark-card shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "table" ? "bg-white dark:bg-dark-card shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700 dark:text-slate-400"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-500">Loading catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-border p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-dark-subtle rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">No products found</h3>
            <p className="text-gray-500 dark:text-slate-400 mt-2 max-w-xs mx-auto text-sm">
              Your inventory is empty or no products match your current filters. Add products to populate your catalog.
            </p>
            <Button onClick={handleAdd} variant="outline" className="mt-6 border-indigo-600 text-indigo-600 hover:bg-indigo-50">
              Add Your First Product
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product._id}
                className="group relative bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border overflow-hidden hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 flex flex-col"
              >
                {/* Image Placeholder or Preview */}
                <div className="aspect-[4/3] bg-gray-50 dark:bg-dark-input relative overflow-hidden flex items-center justify-center border-b border-gray-100 dark:border-dark-border">
                  {product.product_images?.[0] ? (
                    <img
                      src={product.product_images[0]}
                      alt={product.product_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-300 dark:text-slate-700">
                      <Package className="w-12 h-12" />
                      <span className="text-[10px] mt-2 font-medium uppercase tracking-widest">
                        No Image
                      </span>
                    </div>
                  )}
                  {/* Category Chip */}
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                    {product.product_category}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-gray-900 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {product.product_name}
                      </h3>
                      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(product.selling_price)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {product.company} · {product.model_number || "Universal"}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {product.battery_type && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                          {product.battery_type.replace(/_/g, " ")}
                        </span>
                      )}
                      {product.capacity_rating && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
                          {product.capacity_rating}
                        </span>
                      )}
                      {product.warranty_duration_months && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">
                          {product.warranty_duration_months} Months
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-dark-border mt-auto">
                    <Button
                      onClick={() => handleEdit(product)}
                      variant="outline"
                      size="sm"
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs h-auto"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </Button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Remove from Catalog"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-[60px_2.5fr_1.5fr_1fr_120px] gap-2 text-gray-500 dark:text-slate-400 text-xs font-semibold bg-gray-50 dark:bg-dark-subtle p-4 rounded-t-lg">
              <div>#</div>
              <div>Product</div>
              <div>Specifications</div>
              <div>Pricing</div>
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
                      <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        {product.product_images?.[0] ? (
                          <img
                            src={product.product_images[0]}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-900 dark:text-slate-100 truncate text-sm leading-tight">
                            {product.product_name}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {product.company} · {product.model_number}
                        </p>
                        {product.battery_type && (
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-bold uppercase tracking-wider">
                            {product.battery_type.replace(/_/g, " ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-white dark:bg-dark-input p-2 rounded-lg border border-gray-100 dark:border-dark-border mb-3">
                      <div className="text-xs">
                        <span className="text-gray-400">Price: </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(product.selling_price)}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-subtle text-gray-600 dark:text-slate-400 uppercase">
                        {product.product_category}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="w-3 h-3" /> Edit Entry
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
                  <div className="hidden md:grid grid-cols-[60px_2.5fr_1.5fr_1fr_120px] gap-2 items-center p-4 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                    <div className="text-xs text-gray-400 font-mono">
                      #{(page - 1) * 12 + index + 1}
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {product.product_images?.[0] ? (
                          <img
                            src={product.product_images[0]}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {product.product_name}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400">
                          {product.company} · {product.model_number}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-subtle text-[10px] text-gray-600 dark:text-slate-400 uppercase font-black tracking-wider">
                          {product.product_category}
                        </span>
                        {product.battery_type && (
                          <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase">
                            {product.battery_type.split("_")[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        {product.capacity_rating || "N/A"} ·{" "}
                        {product.warranty_duration_months}M
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                        {formatCurrency(product.selling_price)}
                      </p>
                      {product.cost_price > 0 && (
                        <p className="text-[10px] text-red-400 opacity-60 font-medium">
                          Cost: {formatCurrency(product.cost_price)}
                        </p>
                      )}
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

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-8 bg-white dark:bg-dark-card px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border shadow-sm">
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              Showing page <span className="text-indigo-600 dark:text-indigo-400">{pagination.page}</span> of <span className="font-bold">{pagination.pages}</span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 w-8 !p-0"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="h-8 w-8 !p-0"
              >
                <ChevronRight size={16} />
              </Button>
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
