import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  FileText,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button, Input, SelectField } from "../../components/ui/index.js";
import { useGetInvoicesQuery } from "../../features/invoices/invoiceApi.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { ROUTES } from "../../utils/constants.js";
import { useSearchParams } from "react-router-dom";

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
const InvoiceList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [searchIn, setSearchIn] = useState(searchParams.get("search_in") || "");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1,
  );
  const [filters, setFilters] = useState({
    payment_status: searchParams.get("payment_status") || "",
    payment_mode: searchParams.get("payment_mode") || "",
    date_from: searchParams.get("date_from") || "",
    date_to: searchParams.get("date_to") || "",
    due_date_from: searchParams.get("due_date_from") || "",
    due_date_to: searchParams.get("due_date_to") || "",
    min_amount: searchParams.get("min_amount") || "",
    max_amount: searchParams.get("max_amount") || "",
    overdue: searchParams.get("overdue") || "",
    quick_filter: searchParams.get("quick_filter") || "",
  });
  const filterRef = useRef(null);
const isHydrated = useRef(false);
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useGetInvoicesQuery({
    search: searchTerm,
    search_in: searchIn,
    page: currentPage,
    limit: 10,
    ...filters,
  });

  const invoices = response?.invoices || [];
  const pagination = response?.pagination || {};

  const handleViewInvoice = (invoiceId) => {
    navigate(`${ROUTES.INVOICES}/${invoiceId}`, {
      state: {
        from: location.pathname + location.search, // ✅ IMPORTANT
        label: "Invoices",
      },
    });
  };

 const handlePageChange = (newPage) => {
   setCurrentPage(newPage);

   updateURL({
     currentPage: newPage,
   });
 };

  const toggleFilter = () => {
    setShowFilters(!showFilters);
  };
 useEffect(() => {
   setSearchTerm(searchParams.get("search") || "");
   setSearchIn(searchParams.get("search_in") || "");
   setCurrentPage(Number(searchParams.get("page")) || 1);

   setFilters({
     payment_status: searchParams.get("payment_status") || "",
     payment_mode: searchParams.get("payment_mode") || "",
     date_from: searchParams.get("date_from") || "",
     date_to: searchParams.get("date_to") || "",
     due_date_from: searchParams.get("due_date_from") || "",
     due_date_to: searchParams.get("due_date_to") || "",
     min_amount: searchParams.get("min_amount") || "",
     max_amount: searchParams.get("max_amount") || "",
     overdue: searchParams.get("overdue") || "",
     quick_filter: searchParams.get("quick_filter") || "",
   });

   isHydrated.current = true; // ✅ mark ready
 }, [location.search]);// ✅ THIS is key
  
const updateURL = (newState) => {
  const params = {};

  const finalState = {
    filters,
    searchTerm,
    searchIn,
    currentPage,
    ...newState,
  };

  Object.entries(finalState.filters).forEach(([key, value]) => {
    if (value) params[key] = value;
  });

  if (finalState.searchTerm) params.search = finalState.searchTerm;
  if (finalState.searchIn) params.search_in = finalState.searchIn;
  if (finalState.currentPage > 1) params.page = finalState.currentPage;

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
        <div className="max-w-7xl mx-auto px-4 sm:px-3lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  const formatDate = (dateString) => {
    if (!dateString) return "No date";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

    try {
      const options = { year: "numeric", month: "short", day: "numeric" };
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      console.warn("Date formatting error:", error, dateString);
      return "Invalid date";
    }
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };
  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "PARTIAL":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "UNPAID":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };
  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-3lg:px-8">
          {/* Modern Filters & Search */}
          <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border mb-3 gap-2">
            <div className="flex items-center space-x-2">
              {/* Modern Filter Icon with Dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={toggleFilter}
                  className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-md p-2 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <Filter className="h-4 w-4 text-blue-600" />
                </button>
                {showFilters && (
                  <div className="absolute top-12 left-0 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl shadow-xl p-5 z-10 w-[340px] space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-xs font-semibold text-gray-800 dark:text-slate-100">
                        Filters
                      </h3>
                      <button
                        onClick={() =>
                          setFilters({
                            payment_status: "",
                            payment_mode: "",
                            date_from: "",
                            date_to: "",
                            due_date_from: "",
                            due_date_to: "",
                            min_amount: "",
                            max_amount: "",
                            overdue: "",
                            quick_filter: "",
                          })
                        }
                        className="text-xs text-red-500 hover:text-red-600 dark:text-red-400"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Search In */}
                    <div>
                      <label className="text-xs text-ink-muted dark:text-slate-100">
                        Search In
                      </label>
                      <select
                        value={searchIn}
                        onChange={(e) => {
                          const value = e.target.value;

                          const newFilters = {
                            ...filters,
                            searchIn: value,
                          };

                          setFilters(newFilters);
                          setCurrentPage(1);

                          updateURL({
                            filters: newFilters,
                            currentPage: 1,
                          });
                        }}
                        className="w-full mt-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">All Fields</option>
                        <option value="invoice_number">Invoice #</option>
                        <option value="customer_name">Customer</option>
                        <option value="whatsapp_number">Phone</option>
                        <option value="product_name">Product</option>
                        <option value="due_date">Due Date</option>
                        <option value="invoice_date">Invoice Date</option>
                        <option value="amount">Amount</option>
                      </select>
                    </div>

                    {/* Payment Filters */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-ink-muted dark:text-slate-500">
                          Status
                        </label>
                        <select
                          value={filters.payment_status}
                          onChange={(e) => {
                            const value = e.target.value;

                            const newFilters = {
                              ...filters,
                              payment_status: value,
                            };

                            setFilters(newFilters);
                            setCurrentPage(1);

                            updateURL({
                              filters: newFilters,
                              currentPage: 1,
                            });
                          }}
                          className="w-full mt-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                        >
                          <option value="">All</option>
                          <option value="PAID">Paid</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="UNPAID">Unpaid</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-ink-muted dark:text-slate-500">
                          Mode
                        </label>
                        <select
                          value={filters.payment_mode}
                          onChange={(e) => {
                            const value = e.target.value;

                            const newFilters = {
                              ...filters,
                              payment_mode: value,
                            };

                            setFilters(newFilters);
                            setCurrentPage(1);

                            updateURL({
                              filters: newFilters,
                              currentPage: 1,
                            });
                          }}
                          className="w-full mt-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                        >
                          <option value="">All</option>
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="CARD">Card</option>
                          <option value="BANK_TRANSFER">Bank</option>
                          <option value="CREDIT">Credit</option>
                        </select>
                      </div>
                    </div>

                    {/* Invoice Date */}
                    <div>
                      <label className="text-xs text-ink-muted dark:text-slate-500">
                        Invoice Date
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <input
                          type="date"
                          value={filters.date_from}
                          onChange={(e) => {
                            const value = e.target.value;

                            const newFilters = {
                              ...filters,
                              date_from: value,
                            };

                            setFilters(newFilters);
                            setCurrentPage(1);

                            updateURL({
                              filters: newFilters,
                              currentPage: 1,
                            });
                          }}
                          className="px-2 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                        />
                        <input
                          type="date"
                          value={filters.date_to}
                          onChange={(e) => {
                            const value = e.target.value;

                            const newFilters = {
                              ...filters,
                              date_to: value,
                            };

                            setFilters(newFilters);
                            setCurrentPage(1);

                            updateURL({
                              filters: newFilters,
                              currentPage: 1,
                            });
                          }}
                          className="px-2 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                        />
                      </div>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="text-xs text-ink-muted dark:text-slate-500">
                        Due Date
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <input
                          type="date"
                          value={filters.due_date_from}
                          onChange={(e) => {
                            const value = e.target.value;

                            const newFilters = {
                              ...filters,
                              due_date_from: value,
                            };

                            setFilters(newFilters);
                            setCurrentPage(1);

                            updateURL({
                              filters: newFilters,
                              currentPage: 1,
                            });
                          }}
                          className="px-2 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                        />
                        <input
                          type="date"
                          value={filters.due_date_to}
                          onChange={(e) => {
                            const value = e.target.value;

                            const newFilters = {
                              ...filters,
                              due_date_to: value,
                            };

                            setFilters(newFilters);
                            setCurrentPage(1);

                            updateURL({
                              filters: newFilters,
                              currentPage: 1,
                            });
                          }}
                          className="px-2 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                        />
                      </div>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="text-xs text-ink-muted dark:text-slate-500">
                        Amount Range
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <input
                          type="number"
                          placeholder="Min"
                          value={filters.min_amount}
                          onChange={(e) => {
                            const value = e.target.value;

                            const newFilters = {
                              ...filters,
                              min_amount: value,
                            };

                            setFilters(newFilters);
                            setCurrentPage(1);

                            updateURL({
                              filters: newFilters,
                              currentPage: 1,
                            });
                          }}
                          className="px-2 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={filters.max_amount}
                          onChange={(e) => {
                            const value = e.target.value;

                            const newFilters = {
                              ...filters,
                              max_amount: value,
                            };

                            setFilters(newFilters);
                            setCurrentPage(1);

                            updateURL({
                              filters: newFilters,
                              currentPage: 1,
                            });
                          }}
                          className="px-2 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                        />
                      </div>
                    </div>

                    {/* Quick + Overdue */}
                    <div className="flex items-center justify-between">
                      <select
                        value={filters.quick_filter}
                        onChange={(e) => {
                          const value = e.target.value;

                          const newFilters = {
                            ...filters,
                            quick_filter: value,
                          };

                          setFilters(newFilters);
                          setCurrentPage(1);

                          updateURL({
                            filters: newFilters,
                            currentPage: 1,
                          });
                        }}
                        className="px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                      >
                        <option value="">Quick</option>
                        <option value="today">Today</option>
                      </select>

                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={filters.overdue === "true"}
                          onChange={(e) => {
                            const value = e.target.value;

                            const newFilters = {
                              ...filters,
                              overdue: value,
                            };

                            setFilters(newFilters);
                            setCurrentPage(1);

                            updateURL({
                              filters: newFilters,
                              currentPage: 1,
                            });
                          }}
                        />
                        Overdue
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Modern Search Bar */}
              <div className="flex items-center space-x-3 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-input rounded-full px-4 py-1.5 max-w-xs shadow-sm">
                <Search className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                <input
                  placeholder="Search invoices..."
                  className="bg-transparent focus:outline-none text-ink-base dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 w-full text-xs"
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    setCurrentPage(1);

                    updateURL({
                      searchTerm: value,
                      currentPage: 1,
                    });
                  }}
                />
              </div>
            </div>
            {canCreate("invoices") && (
              <Link to={`${ROUTES.INVOICES}/new`}>
                <button className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-dark-input border-2 border-blue-500 text-blue-500 dark:text-blue-400 rounded-md text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-600 hover:text-blue-600">
                  <Plus className="w-4 h-4" />
                  Create Invoice
                </button>
              </Link>
            )}
          </div>
          {/* Active Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-4 px-1">
            {filters.payment_status && (
              <Chip
                label={`Status: ${filters.payment_status}`}
                onRemove={() =>
                  setFilters((p) => ({ ...p, payment_status: "" }))
                }
              />
            )}

            {filters.payment_mode && (
              <Chip
                label={`Mode: ${filters.payment_mode}`}
                onRemove={() => setFilters((p) => ({ ...p, payment_mode: "" }))}
              />
            )}

            {(filters.date_from || filters.date_to) && (
              <Chip
                label={`Invoice: ${filters.date_from || "?"} → ${filters.date_to || "?"}`}
                onRemove={() =>
                  setFilters((p) => ({ ...p, date_from: "", date_to: "" }))
                }
              />
            )}

            {(filters.due_date_from || filters.due_date_to) && (
              <Chip
                label={`Due: ${filters.due_date_from || "?"} → ${filters.due_date_to || "?"}`}
                onRemove={() =>
                  setFilters((p) => ({
                    ...p,
                    due_date_from: "",
                    due_date_to: "",
                  }))
                }
              />
            )}

            {(filters.min_amount || filters.max_amount) && (
              <Chip
                label={`₹${filters.min_amount || 0} - ₹${filters.max_amount || "∞"}`}
                onRemove={() =>
                  setFilters((p) => ({
                    ...p,
                    min_amount: "",
                    max_amount: "",
                  }))
                }
              />
            )}

            {filters.quick_filter && (
              <Chip
                label={`Quick: ${filters.quick_filter}`}
                onRemove={() => setFilters((p) => ({ ...p, quick_filter: "" }))}
              />
            )}

            {filters.overdue === "true" && (
              <Chip
                label="Overdue"
                onRemove={() => setFilters((p) => ({ ...p, overdue: "" }))}
              />
            )}
          </div>
          {/* Invoice List */}
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
            {error ? (
              <div className="p-6 text-center">
                <div className="text-red-600">
                  Failed to load invoices. Please try again.
                </div>
                <Button onClick={refetch} className="mt-4">
                  Retry
                </Button>
              </div>
            ) : !invoices?.length ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base font-medium text-ink-base dark:text-slate-100 mb-2">
                  No invoices found
                </h3>
                <p className="text-ink-secondary dark:text-slate-400 mb-3">
                  {searchTerm || filters.payment_status
                    ? "No invoices match your search criteria."
                    : "Get started by creating your first invoice."}
                </p>
                <div className="flex items-center justify-center">
                  {canCreate("invoices") && (
                    <Link to={`${ROUTES.INVOICES}/new`}>
                      <Button>Create First Invoice</Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="">
                {/* Desktop Header */}
                <div className="hidden md:grid grid-cols-[60px_2fr_1fr_1fr_120px] gap-2 text-gray-500 dark:text-slate-400 text-xs font-semibold bg-gray-200 dark:bg-dark-subtle p-4 rounded-t-lg">
                  <div>S No.</div>
                  <div>Invoice Details</div>
                  <div>Items</div>
                  <div>Payment Details</div>
                  <div>Actions</div>
                </div>

                {/* Invoice Rows */}
                {invoices.map((invoice, index) => {
                  const customerName = invoice.customer_id?.full_name
                    ? invoice.customer_id.full_name
                        .split(" ")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(" ")
                    : "N/A";

                  return (
                    <div
                      key={invoice._id}
                      className={
                        index % 2 === 0
                          ? "bg-white dark:bg-dark-card"
                          : "bg-gray-50 dark:bg-dark-subtle"
                      }
                    >
                      {(() => {
                        const isOverdue =
                          invoice.due_date &&
                          new Date(invoice.due_date) < new Date() &&
                          invoice.payment_status !== "PAID";
                        const overdueDays = isOverdue
                          ? Math.ceil(
                              (new Date() - new Date(invoice.due_date)) /
                                (1000 * 60 * 60 * 24),
                            )
                          : 0;
                        return (
                          <>
                            {/* ── Mobile Card ── */}
                      <div className="md:hidden p-4 border-b border-gray-100 dark:border-dark-border">
                        {/* Header: icon + invoice number + status pill */}
                        <div className="flex items-start gap-3 mb-2">
                          <div className="shrink-0 ">
                            <div className="w-10 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className="font-bold text-sm text-ink-base dark:text-slate-100 leading-tight truncate cursor-pointer hover:underline"
                                onClick={() => {
                                  if (invoice.customer_id?._id) {
                                    navigate(
                                      `${ROUTES.CUSTOMERS}/${invoice.customer_id._id}`,
                                      {
                                        state: {
                                          from: location.pathname,
                                          label: "Invoices",
                                        },
                                      },
                                    );
                                  }
                                }}
                              >
                                {customerName}
                              </p>
                              <span className="text-sm font-bold text-ink-base dark:text-slate-100">
                                {formatCurrency(invoice.total_amount)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] flex-wrap">
                              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                {invoice.invoice_number}
                              </span>
                              <span className="text-gray-300">·</span>
                              <span className="text-gray-500 dark:text-slate-400">
                                {invoice.customer_id?.whatsapp_number}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Items list */}
                        {invoice.invoice_items?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-400 mb-1">Items</p>
                            <div className="flex flex-wrap gap-1">
                              {invoice.invoice_items
                                .slice(0, 3)
                                .map((item, i) => (
                                  <span
                                    key={i}
                                    onClick={() =>
                                      navigate(
                                        `${ROUTES.PRODUCTS}/${item._id}`,
                                        {
                                          state: {
                                            from: location.pathname,
                                            label: "Invoices",
                                          },
                                        },
                                      )
                                    }
                                    className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full"
                                  >
                                    {item.product_name}
                                    <span className="inline-block max-w-[80px] truncate">
                                      ({item?.serial_number})
                                    </span>
                                    ×{item.quantity}
                                  </span>
                                ))}
                              {invoice.invoice_items.length > 3 && (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                  +{invoice.invoice_items.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Footer Action Row */}
                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-50 dark:border-dark-border/50">
                          <div className="flex flex-col">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium w-fit ${getPaymentStatusColor(invoice.payment_status)}`}
                            >
                              {invoice.payment_status || "UNPAID"}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-0.5">
                                Overdue {overdueDays}d
                              </span>
                            )}
                          </div>
                          <button
                            className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1.5 shadow-sm"
                            onClick={() => handleViewInvoice(invoice._id)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </div>
                      </div>

                      {/* ── Desktop Row ── */}
                      <div className="hidden md:grid grid-cols-[60px_2fr_1fr_1fr_120px] gap-2 items-center p-4 ">
                        <div className="text-ink-secondary dark:text-slate-400">
                          {(currentPage - 1) * 10 + index + 1}
                        </div>
                        <div className="flex gap-3 items-center">
                          <div
                            className="cursor-pointer"
                            onClick={() => handleViewInvoice(invoice._id)}
                          >
                            <div className="w-10 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div>
                            <div
                              className="font-bold text-sm text-ink-base dark:text-slate-100 cursor-pointer hover:underline"
                              onClick={() => {
                                if (invoice.customer_id?._id) {
                                  navigate(
                                    `${ROUTES.CUSTOMERS}/${invoice.customer_id._id}`,
                                    {
                                      state: {
                                        from: location.pathname,
                                        label: "Invoices",
                                      },
                                    },
                                  );
                                }
                              }}
                            >
                              {customerName}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-ink-secondary dark:text-slate-400 mt-0.5 flex-wrap">
                              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                {invoice.invoice_number}
                              </span>
                              <span>·</span>
                              <span>
                                {invoice.customer_id?.whatsapp_number || "N/A"}
                              </span>
                              <span>·</span>
                              <span>{formatDate(invoice.invoice_date)}</span>
                            </div>
                          </div>
                        </div>
                        {/* Items column */}
                        <div className="text-xs text-ink-secondary dark:text-slate-400">
                          {invoice.invoice_items?.length > 0 ? (
                            <div className="space-y-0.5">
                              {invoice.invoice_items
                                .slice(0, 3)
                                .map((item, i) => (
                                  <div
                                    key={i}
                                    onClick={() =>
                                      navigate(
                                        `${ROUTES.PRODUCTS}/${item._id}`,
                                        {
                                          state: {
                                            from: location.pathname,
                                            label: "Invoices",
                                          },
                                        },
                                      )
                                    }
                                    className="flex items-center gap-1.5 min-w-0 cursor-pointer"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>

                                    {/* Product name full visible */}
                                    <span className="text-gray-700 dark:text-slate-200 shrink-0">
                                      {item.product_name}
                                    </span>

                                    {/* Only serial truncated */}
                                    <span
                                      className="truncate max-w-[80px] text-gray-700 dark:text-slate-300"
                                      title={item?.serial_number}
                                    >
                                      ({item?.serial_number})
                                    </span>

                                    <span className="text-gray-400 dark:text-slate-500 shrink-0">
                                      ×{item.quantity}
                                    </span>
                                  </div>
                                ))}
                              {invoice.invoice_items.length > 3 && (
                                <p className="text-xs text-gray-400">
                                  +{invoice.invoice_items.length - 3} more item
                                  {invoice.invoice_items.length - 3 > 1
                                    ? "s"
                                    : ""}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                        {/* Payment Details column */}
                        <div className="text-ink-secondary dark:text-slate-400">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm dark:text-slate-100">
                                {formatCurrency(invoice.total_amount)}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 font-medium rounded-full ${getPaymentStatusColor(invoice.payment_status)}`}
                              >
                                {invoice.payment_status || "UNPAID"}
                              </span>
                            </div>
                            {invoice.due_date && invoice.payment_status !== "PAID" && (
                              <p
                                className={`text-[11px] ${isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-500 dark:text-slate-500"}`}
                              >
                                Due {formatDate(invoice.due_date)}
                                {isOverdue && ` · overdue ${overdueDays}d`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <button
                            className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1"
                            onClick={() => handleViewInvoice(invoice._id)}
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
                </div>
              );
            })}

                {invoices.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-ink-secondary dark:text-slate-400 text-base">
                      No invoices found
                    </div>
                    <div className="text-ink-muted dark:text-slate-500 text-xs mt-2">
                      Create your first invoice to get started
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-4 sm:px-3 py-1.5 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="text-xs text-ink-muted dark:text-slate-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total,
                    )}{" "}
                    of {pagination.total} invoices
                  </div>

                  <div className="flex items-center gap-2">
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
                      {Array.from(
                        { length: pagination.pages },
                        (_, i) => i + 1,
                      ).map((pageNum) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage =
                          pageNum === 1 ||
                          pageNum === pagination.pages ||
                          Math.abs(pageNum - pagination.page) <= 1;

                        if (!showPage) {
                          // Show ellipsis
                          if (
                            pageNum === pagination.page - 2 ||
                            pageNum === pagination.page + 2
                          ) {
                            return (
                              <span
                                key={pageNum}
                                className="px-2 py-1 text-xs text-gray-500"
                              >
                                ...
                              </span>
                            );
                          }
                          return null;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={
                              pageNum === pagination.page
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 p-0 text-xs"
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
            {pagination.pages <= 1 && (
              <div className="px-4 sm:px-3 py-1.5 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input">
                <div className="text-xs text-gray-500 dark:text-slate-400 text-center">
                  Showing {pagination.total || 0} of {pagination.total || 0}{" "}
                  invoices
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceList;
