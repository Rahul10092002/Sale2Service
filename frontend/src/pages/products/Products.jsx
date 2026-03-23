import React, { useState, useMemo } from "react";
import { Search, Edit, Trash2, Table, Package } from "lucide-react";
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
                <div className="hidden md:grid grid-cols-[60px_2fr_1fr_120px] gap-4 text-gray-500 text-sm font-semibold bg-gray-200 p-4 rounded-t-lg">
                  <div>S No.</div>
                  <div>Product Details</div>
                  <div>Info & Service</div>
                  <div>Actions</div>
                </div>

                {/* Product Rows */}
                {products.map((product, index) => (
                  <div
                    key={product._id}
                    className={`flex flex-col md:grid md:grid-cols-[60px_2fr_1fr_120px] gap-4 items-center p-4 rounded-lg ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-100"
                    }  shadow-sm`}
                  >
                    {/* S No. */}
                    <div className="text-gray-600 md:block hidden">
                      {(page - 1) * pagination.limit + index + 1}
                    </div>

                    {/* Product Details */}
                    <div className="flex gap-3 items-center w-full md:w-auto">
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
                        <div className="text-sm text-gray-600 ">
                          <p>Serial: {product.serial_number}</p>
                          <p>
                            {product.company} · {product.model_number}
                          </p>
                          <p className="md:hidden">Status: {product.status}</p>
                        </div>
                      </div>
                    </div>

                    {/* Info & Service */}
                    <div className="text-gray-600 w-full md:w-auto">
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

                    {/* Actions */}
                    <div className="relative w-full md:w-auto flex justify-end md:justify-start">
                      <button
                        className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                        onClick={() => handleViewProduct(product._id)}
                      >
                        View Details
                      </button>
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
