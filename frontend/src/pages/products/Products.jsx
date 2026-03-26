import React, { useState, useMemo } from "react";
import {
  Search,
  Table,
  Package,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Phone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "../../components/ui/index.js";
import { useGetProductsQuery } from "../../features/products/productApi.js";
import { ROUTES } from "../../utils/constants.js";
import {
  ServiceBadge,
  ServiceTableModal,
} from "../../components/service/index.js";

const Products = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [showServiceTable, setShowServiceTable] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState({});

  const { data: response, isLoading } = useGetProductsQuery({
    search: searchTerm,
    page,
    limit: 10,
  });

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

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-white rounded-lg shadow-sm border border-gray-200 mb-6 gap-4">
            <div className="flex items-center space-x-4 w-2/3">
              <div className="flex-1 flex items-center space-x-3 border border-gray-300 bg-white rounded-full px-4 py-2 shadow-sm">
                <Search className="h-5 w-5 text-gray-500" />
                <input
                  placeholder="Search by serial, product, company or model..."
                  className="bg-transparent focus:outline-none text-gray-600 placeholder-gray-400 w-full text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
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
                            {product.warranty_end_date
                              ? new Date(
                                  product.warranty_end_date,
                                ).toLocaleDateString("en-IN")
                              : "N/A"}
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
                            <span className="w-3.5 h-3.5 text-blue-600">View Services</span>
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
                          <p>
                            Warranty:{" "}
                            {product.warranty_end_date
                              ? new Date(
                                  product.warranty_end_date,
                                ).toLocaleDateString()
                              : "N/A"}
                          </p>
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
