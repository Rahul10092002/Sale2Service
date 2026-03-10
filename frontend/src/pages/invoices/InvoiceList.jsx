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
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, SelectField } from "../../components/ui/index.js";
import { useGetInvoicesQuery } from "../../features/invoices/invoiceApi.js";
import { ROUTES } from "../../utils/constants.js";
import Layout from "../../components/layout/Layout.jsx";

const InvoiceList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchIn, setSearchIn] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    payment_status: "",
    date_from: "",
    date_to: "",
  });
  const filterRef = useRef(null);

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
    navigate(`${ROUTES.INVOICES}/${invoiceId}`);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const toggleFilter = () => {
    setShowFilters(!showFilters);
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
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };
  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PARTIAL":
        return "bg-yellow-100 text-yellow-800";
      case "UNPAID":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       
          {/* Modern Filters & Search */}
          <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-white rounded-lg shadow-sm border border-gray-200 mb-6 gap-4">
            <div className="flex items-center space-x-4">
              {/* Modern Filter Icon with Dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={toggleFilter}
                  className="flex items-center justify-center bg-blue-100 rounded-md p-2 hover:bg-blue-200 transition-colors"
                >
                  <Filter className="h-5 w-5 text-blue-600" />
                </button>
                {showFilters && (
                  <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-md shadow-lg p-4 z-10 w-80">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex flex-col">
                        <label className="text-sm text-gray-600 font-medium mb-1">
                          Payment Status:
                        </label>
                        <select
                          value={filters.payment_status}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              payment_status: e.target.value,
                            }))
                          }
                          className="p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All</option>
                          <option value="PAID">Paid</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="UNPAID">Unpaid</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm text-gray-600 font-medium mb-1">
                          Search In:
                        </label>
                        <select
                          value={searchIn}
                          onChange={(e) => setSearchIn(e.target.value)}
                          className="p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Fields</option>
                          <option value="invoice_number">Invoice #</option>
                          <option value="customer_name">Customer</option>
                          <option value="whatsapp_number">Phone</option>
                          <option value="product_name">Product</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <label className="text-sm text-gray-600 font-medium mb-1">
                            Date From:
                          </label>
                          <input
                            type="date"
                            value={filters.date_from}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                date_from: e.target.value,
                              }))
                            }
                            className="p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-sm text-gray-600 font-medium mb-1">
                            Date To:
                          </label>
                          <input
                            type="date"
                            value={filters.date_to}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                date_to: e.target.value,
                              }))
                            }
                            className="p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modern Search Bar */}
              <div className="flex items-center space-x-3 border border-gray-300 bg-white rounded-full px-4 py-2 max-w-xs shadow-sm">
                <Search className="h-5 w-5 text-gray-500" />
                <input
                  placeholder="Search invoices..."
                  className="bg-transparent focus:outline-none text-gray-600 placeholder-gray-400 w-full text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Link to={`${ROUTES.INVOICES}/new`}>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-500 text-blue-500 rounded-md text-sm font-medium hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600">
                <Plus className="w-4 h-4" />
                Create Invoice
              </button>
            </Link>
          </div>

          {/* Invoice List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No invoices found
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || filters.payment_status
                    ? "No invoices match your search criteria."
                    : "Get started by creating your first invoice."}
                </p>
                <Link to={`${ROUTES.INVOICES}/new`}>
                  <Button>Create First Invoice</Button>
                </Link>
              </div>
            ) : (
              <div className="">
                {/* Desktop Header */}
                <div className="hidden md:grid grid-cols-[60px_2fr_1fr_120px] gap-4 text-gray-500 text-sm font-semibold bg-gray-200 p-4 rounded-t-lg">
                  <div>S No.</div>
                  <div>Invoice Details</div>
                  <div>Payment Details</div>
                  <div>Actions</div>
                </div>

                {/* Invoice Rows */}
                {invoices.map((invoice, index) => (
                  <div
                    key={invoice._id}
                    className={`flex flex-col md:grid md:grid-cols-[60px_2fr_1fr_120px] gap-4 items-center p-4 rounded-sm ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-100"
                    }  shadow-sm`}
                  >
                    {/* S No. */}
                    <div className="text-gray-600 md:block hidden">
                      {(currentPage - 1) * 10 + index + 1}
                    </div>

                    {/* Invoice Details */}
                    <div className="flex gap-3 items-center w-full md:w-auto">
                      <div
                        className="cursor-pointer"
                        onClick={() => handleViewInvoice(invoice._id)}
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-base">
                          {invoice.customer_id?.full_name
                            ? invoice.customer_id.full_name
                                .split(" ")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1),
                                )
                                .join(" ")
                            : "N/A"}
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Invoice Number: {invoice.invoice_number || ""}</p>
                          <p>
                            Invoice Date:{" "}
                            {formatDate(invoice.invoice_date) || ""}
                          </p>
                          <p className="md:hidden">
                            Phone:{" "}
                            {invoice.customer_id?.whatsapp_number || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="text-gray-600 w-full md:w-auto">
                      <div className="text-sm">
                        <p>Payment Mode: {invoice.payment_mode || ""}</p>
                        <p>
                          Total Amount: {formatCurrency(invoice.total_amount)}
                        </p>
                        <p>
                          Status:{" "}
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(invoice.payment_status)}`}
                          >
                            {invoice.payment_status || "UNPAID"}
                          </span>
                        </p>
                        {invoice.discount > 0 && (
                          <p className="text-green-600">
                            Discount: {formatCurrency(invoice.discount)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="relative w-full md:w-auto flex flex-wrap gap-2 justify-end md:justify-start">
                      <button
                        className="bg-blue-500 text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1"
                        onClick={() => handleViewInvoice(invoice._id)}
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                ))}

                {invoices.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-lg">
                      No invoices found
                    </div>
                    <div className="text-gray-400 text-sm mt-2">
                      Create your first invoice to get started
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-500">
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
                                className="px-2 py-1 text-sm text-gray-500"
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
                            className="w-8 h-8 p-0 text-sm"
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
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500 text-center">
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
