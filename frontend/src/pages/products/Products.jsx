import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Table,
  Package,
  User,
  FileText,
  Phone,
  Filter,
  ScanLine,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "../../components/ui/index.js";
import { useGetProductsQuery } from "../../features/products/productApi.js";
import SerialScanner from "../../components/invoice/SerialScanner.jsx";
import { ROUTES } from "../../utils/constants.js";
import {
  ServiceBadge,
  ServiceTableModal,
} from "../../components/service/index.js";

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

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "REPLACED", label: "Replaced" },
  { value: "RETURNED", label: "Returned" },
  { value: "UNDER_SERVICE", label: "Under Service" },
];

const SERVICE_PLAN_OPTIONS = [
  { value: "", label: "Any Service Plan" },
  { value: "yes", label: "Has Service Plan" },
  { value: "no", label: "No Service Plan" },
];

const SERVICE_DUE_OPTIONS = [
  { value: "", label: "Any Service Due" },
  { value: "7", label: "Due in 7 days" },
  { value: "14", label: "Due in 14 days" },
  { value: "30", label: "Due in 30 days" },
  { value: "60", label: "Due in 60 days" },
  { value: "90", label: "Due in 90 days" },
];

const WARRANTY_OPTIONS = [
  { value: "", label: "Any Warranty" },
  { value: "expired", label: "Expired" },
  { value: "30", label: "Expiring in 30 days" },
  { value: "60", label: "Expiring in 60 days" },
  { value: "90", label: "Expiring in 90 days" },
  { value: "180", label: "Expiring in 6 months" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Any Payment" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "UNPAID", label: "Unpaid" },
];

const DEFAULT_FILTERS = {
  product_category: "",
  status: "",
  has_service_plan: "",
  service_due_days: "",
  warranty_status: "",
  payment_status: "",
};

const Products = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [showServiceTable, setShowServiceTable] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const filterRef = useRef(null);

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

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const queryParams = useMemo(() => {
    const params = { search: searchTerm, page, limit: 10 };
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
    return params;
  }, [searchTerm, page, filters]);

  const { data: response, isLoading } = useGetProductsQuery(queryParams);

  const products = response?.products || [];
  const pagination = response?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  };

  const pagesArray = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= pagination.pages; i++) pages.push(i);
    return pages;
  }, [pagination.pages]);

  const handleViewProduct = (productId) => {
    navigate(`${ROUTES.PRODUCTS}/${productId}`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };
const getWarrantyInfo = (product) => {
  if (!product.warranty_end_date) return null;

  const start = new Date(product.warranty_start_date);
  const end = new Date(product.warranty_end_date);
  const today = new Date();

  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

  return {
    start,
    end,
    diffDays,
    isExpired: diffDays < 0,
    isExpiringSoon: diffDays >= 0 && diffDays <= 5,
  };
};
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters & Search */}
          <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-white rounded-lg shadow-sm border border-gray-200 mb-6 gap-4">
            <div className="flex items-center space-x-4">
              {/* Filter Icon with Dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center bg-blue-100 rounded-md p-2 hover:bg-blue-200 transition-colors"
                >
                  <Filter className="h-5 w-5 text-blue-600" />
                </button>
                {showFilters && (
                  <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-md shadow-lg p-4 z-10 w-96">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <label className="text-sm text-gray-600 font-medium mb-1">
                          Category:
                        </label>
                        <select
                          value={filters.product_category}
                          onChange={(e) =>
                            handleFilterChange(
                              "product_category",
                              e.target.value,
                            )
                          }
                          className="p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:border-blue-500"
                        >
                          {CATEGORY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm text-gray-600 font-medium mb-1">
                          Status:
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) =>
                            handleFilterChange("status", e.target.value)
                          }
                          className="p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:border-blue-500"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm text-gray-600 font-medium mb-1">
                          Service Plan:
                        </label>
                        <select
                          value={filters.has_service_plan}
                          onChange={(e) =>
                            handleFilterChange(
                              "has_service_plan",
                              e.target.value,
                            )
                          }
                          className="p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:border-blue-500"
                        >
                          {SERVICE_PLAN_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm text-gray-600 font-medium mb-1">
                          Service Due:
                        </label>
                        <select
                          value={filters.service_due_days}
                          onChange={(e) =>
                            handleFilterChange(
                              "service_due_days",
                              e.target.value,
                            )
                          }
                          className="p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:border-blue-500"
                        >
                          {SERVICE_DUE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm text-gray-600 font-medium mb-1">
                          Warranty:
                        </label>
                        <select
                          value={filters.warranty_status}
                          onChange={(e) =>
                            handleFilterChange(
                              "warranty_status",
                              e.target.value,
                            )
                          }
                          className="p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:border-blue-500"
                        >
                          {WARRANTY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm text-gray-600 font-medium mb-1">
                          Payment:
                        </label>
                        <select
                          value={filters.payment_status}
                          onChange={(e) =>
                            handleFilterChange("payment_status", e.target.value)
                          }
                          className="p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:border-blue-500"
                        >
                          {PAYMENT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Bar */}
              <div className="flex items-center space-x-3 border border-gray-300 bg-white rounded-full px-4 py-2 max-w-xs shadow-sm">
                <Search className="h-5 w-5 text-gray-500" />
                <input
                  placeholder="Search products..."
                  className="bg-transparent focus:outline-none text-gray-600 placeholder-gray-400 w-full text-sm"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Scan button */}
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-lg transition-colors"
                title="Scan serial number"
              >
                <ScanLine className="h-4 w-4" />
                <span className="hidden sm:inline">Scan</span>
              </button>

              {showScanner && (
                <SerialScanner
                  onScan={(value) => {
                    setSearchTerm(value);
                    setPage(1);
                    setShowScanner(false);
                  }}
                  onClose={() => setShowScanner(false)}
                />
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {isLoading ? (
              <div className="p-6">Loading...</div>
            ) : !products.length ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  No products found
                </h3>
              </div>
            ) : (
              <div className="">
                {/* Desktop Header */}
                <div className="hidden md:grid grid-cols-[60px_2fr_1fr_1fr_120px] gap-4 text-gray-500 text-sm font-semibold bg-gray-200 p-4 rounded-t-lg">
                  <div>S No.</div>
                  <div>Product Details</div>
                  <div>Info & Service</div>
                  <div>Customer & Invoice</div>
                  <div>Actions</div>
                </div>

                {/* Product Rows */}
                {products.map((product, index) => (
                  <div
                    key={product._id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    {/* ── Mobile Card ── */}
                    <div className="md:hidden p-4 border-b border-gray-100">
                      {/* Header: icon + name + status */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="shrink-0 cursor-pointer"
                          onClick={() => handleViewProduct(product._id)}
                        >
                          <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 capitalize leading-tight truncate">
                            {product.product_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {product.company} · {product.model_number}
                          </p>
                          <p className="text-xs text-gray-400">
                            S/N: {product.serial_number}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 mt-0.5 ${
                            product.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {product.status}
                        </span>
                      </div>

                      {/* Price + Warranty chips */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-400 mb-0.5">Price</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatCurrency(product.selling_price)}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-400 mb-0.5">
                            Warranty
                          </p>
                          <p className="text-xs font-medium text-gray-700">
                            {(() => {
                              const w = getWarrantyInfo(product);
                              if (!w)
                                return (
                                  <p className="text-xs text-gray-400">
                                    No Warranty
                                  </p>
                                );

                              return (
                                <div className="flex flex-col gap-1">
                                  {/* Duration + Type */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-gray-800">
                                      {product.warranty_duration_months}M
                                    </span>

                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                                      {product.warranty_type}
                                    </span>

                                    {/* Status badge */}
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                                        w.isExpired
                                          ? "bg-red-100 text-red-600"
                                          : w.isExpiringSoon
                                            ? "bg-yellow-100 text-yellow-600"
                                            : "bg-green-100 text-green-600"
                                      }`}
                                    >
                                      {w.isExpired
                                        ? "Expired"
                                        : w.isExpiringSoon
                                          ? "Expiring Soon"
                                          : "Active"}
                                    </span>
                                  </div>

                                  {/* Dates */}
                                  <div className="text-[11px] text-gray-500">
                                    {w.start.toLocaleDateString("en-IN")} →{" "}
                                    {w.end.toLocaleDateString("en-IN")}
                                  </div>

                                  {/* Remaining */}
                                  <div
                                    className={`text-[11px] font-medium ${
                                      w.isExpired
                                        ? "text-red-500"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {w.isExpired
                                      ? `Expired ${Math.abs(w.diffDays)} days ago`
                                      : `${w.diffDays} days left`}
                                  </div>

                                  {/* Pro warranty */}
                                  {product.pro_warranty_end_date && (
                                    <div className="text-[10px] text-indigo-600">
                                      Pro till{" "}
                                      {new Date(
                                        product.pro_warranty_end_date,
                                      ).toLocaleDateString("en-IN")}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </p>
                        </div>
                      </div>

                      {/* Service badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <ServiceBadge
                          itemId={product._id}
                          invoiceId={product.invoice_id}
                          product={product}
                          hasService={product.hasServicePlan}
                          nextServiceDate={product.nextServiceDate}
                        />
                        {product.hasServicePlan && (
                          <button
                            onClick={() => setShowServiceTable(product)}
                            className="p-1 rounded-md hover:bg-blue-100"
                            title="View Service Table"
                          >
                            <span className="w-3.5 h-3.5 text-blue-600">
                              View Services
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Customer + Invoice */}
                      {product.customer ? (
                        <div className="bg-indigo-50 rounded-lg px-3 py-2 mb-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="text-sm font-medium text-gray-800 truncate">
                                {product.customer.full_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500 shrink-0">
                              <Phone className="w-3 h-3 shrink-0" />
                              <span className="text-xs">
                                {product.customer.whatsapp_number}
                              </span>
                            </div>
                          </div>
                          {product.invoice && (
                            <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-indigo-100 flex-wrap">
                              <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span className="font-mono text-xs text-indigo-700">
                                {product.invoice.invoice_number}
                              </span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-400">
                                {new Date(
                                  product.invoice.invoice_date,
                                ).toLocaleDateString("en-IN")}
                              </span>
                              <span
                                className={`ml-auto text-xs font-semibold ${
                                  product.invoice.payment_status === "PAID"
                                    ? "text-green-600"
                                    : product.invoice.payment_status ===
                                        "PARTIAL"
                                      ? "text-yellow-600"
                                      : "text-red-500"
                                }`}
                              >
                                {product.invoice.payment_status}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mb-3">
                          No customer data
                        </p>
                      )}

                      {/* Action button */}
                      <button
                        className="w-full bg-blue-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
                        onClick={() => handleViewProduct(product._id)}
                      >
                        View Details
                      </button>
                    </div>

                    {/* ── Desktop Row ── */}
                    <div className="hidden md:grid grid-cols-[60px_2fr_1fr_1fr_120px] gap-4 items-start p-4">
                      <div className="text-gray-600 pt-1">
                        {(page - 1) * pagination.limit + index + 1}
                      </div>
                      <div className="flex gap-3 items-center">
                        <div
                          className="cursor-pointer"
                          onClick={() => handleViewProduct(product._id)}
                        >
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 text-base capitalize">
                            {product.product_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Serial: {product.serial_number}</p>
                            <p>
                              {product.company} · {product.model_number}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-gray-600">
                        <div className="text-sm">
                          <p>Price: {formatCurrency(product.selling_price)}</p>
                          {(() => {
                            const w = getWarrantyInfo(product);
                            if (!w) return <p>No Warranty</p>;

                            return (
                              <div className="mt-1">
                                {/* Top Row */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-gray-800">
                                    {product.warranty_duration_months}M
                                  </span>

                                 

                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded ${
                                      w.isExpired
                                        ? "bg-red-100 text-red-600"
                                        : w.isExpiringSoon
                                          ? "bg-yellow-100 text-yellow-600"
                                          : "bg-green-100 text-green-600"
                                    }`}
                                  >
                                    {w.isExpired
                                      ? "Expired"
                                      : w.isExpiringSoon
                                        ? "Soon"
                                        : "Active"}
                                  </span>
                                </div>

                                {/* Dates */}
                                <div className="text-xs text-gray-500">
                                  {w.start.toLocaleDateString("en-IN")} →{" "}
                                  {w.end.toLocaleDateString("en-IN")}
                                </div>

                                {/* Remaining */}
                                <div
                                  className={`text-xs font-medium ${
                                    w.isExpired
                                      ? "text-red-500"
                                      : "text-green-600"
                                  }`}
                                >
                                  {w.isExpired
                                    ? `${Math.abs(w.diffDays)}d ago`
                                    : `${w.diffDays}d left`}
                                </div>

                                {/* Pro warranty */}
                                {product.pro_warranty_end_date && (
                                  <div className="text-[10px] text-indigo-600">
                                    Pro:{" "}
                                    {new Date(
                                      product.pro_warranty_end_date,
                                    ).toLocaleDateString("en-IN")}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <div className="flex items-center gap-2 mt-1">
                            <ServiceBadge
                              itemId={product._id}
                              invoiceId={product.invoice_id}
                              product={product}
                              hasService={product.hasServicePlan}
                              nextServiceDate={product.nextServiceDate}
                            />
                            {product.hasServicePlan && (
                              <button
                                onClick={() => setShowServiceTable(product)}
                                className="p-1 rounded-md hover:bg-blue-100"
                                title="View Service Table"
                              >
                                <Table className="w-3 h-3 text-blue-600" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {product.customer ? (
                          <div>
                            <div className="flex items-center gap-1 font-medium text-gray-800">
                              <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate">
                                {product.customer.full_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{product.customer.whatsapp_number}</span>
                            </div>
                            {product.invoice && (
                              <div className="mt-1">
                                <div className="flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span className="font-mono text-xs text-indigo-700">
                                    {product.invoice.invoice_number}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {new Date(
                                    product.invoice.invoice_date,
                                  ).toLocaleDateString("en-IN")}
                                  {" · "}
                                  <span
                                    className={`font-medium ${
                                      product.invoice.payment_status === "PAID"
                                        ? "text-green-600"
                                        : product.invoice.payment_status ===
                                            "PARTIAL"
                                          ? "text-yellow-600"
                                          : "text-red-500"
                                    }`}
                                  >
                                    {product.invoice.payment_status}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            No customer data
                          </span>
                        )}
                      </div>
                      <div>
                        <button
                          className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                          onClick={() => handleViewProduct(product._id)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {products.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-lg">
                      No products found
                    </div>
                    <div className="text-gray-400 text-sm mt-2">
                      Add products through invoices to get started
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="px-4 sm:px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total,
                      )}{" "}
                      of {pagination.total} products
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      {pagesArray.map((pg) => (
                        <button
                          key={pg}
                          onClick={() => setPage(pg)}
                          className={`w-8 h-8 p-0 text-sm rounded ${pg === pagination.page ? "bg-indigo-600 text-white" : "bg-white border"}`}
                        >
                          {pg}
                        </button>
                      ))}
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(pagination.pages, p + 1))
                        }
                        disabled={page >= pagination.pages}
                        className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
                {pagination.pages <= 1 && (
                  <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-500 text-center">
                      Showing {pagination.total || 0} of {pagination.total || 0}{" "}
                      products
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Table Modal */}
      {showServiceTable && (
        <ServiceTableModal
          itemId={showServiceTable._id}
          invoiceId={showServiceTable.invoice_id}
          product={showServiceTable}
          isOpen={!!showServiceTable}
          onClose={() => setShowServiceTable(null)}
        />
      )}
    </>
  );
};

export default Products;
