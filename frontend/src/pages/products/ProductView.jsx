import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Package,
  Calendar,
  DollarSign,
  Building,
  Hash,
  Tag,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "../../components/ui/index.js";
import { useGetProductByIdQuery } from "../../features/products/productApi.js";
import { ROUTES } from "../../utils/constants.js";
import { LoadingSpinner } from "../../components/ui/index.js";
import { ServiceIntegration } from "../../components/service/index.js";

const ProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: response, isLoading, error } = useGetProductByIdQuery(id);

  // Extract product from nested response
  const product = response?.product;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "warranty":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Product not found
              </h3>
              <p className="text-gray-500 mb-6">
                The product you're looking for doesn't exist or has been
                deleted.
              </p>
              <Link to={ROUTES.PRODUCTS}>
                <Button>Back to Products</Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate(ROUTES.PRODUCTS)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Products
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              Product Details
            </h1>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Product Info */}
            <div className="xl:col-span-2 space-y-6">
              {/* Product Header Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
                  <div className="flex items-center space-x-4">
                    {/* Product Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                        <Package size={32} className="text-purple-500" />
                      </div>
                    </div>
                    {/* Product Info */}
                    <div className="text-white">
                      <h2 className="text-2xl font-bold">
                        {product.product_name || "Unknown Product"}
                      </h2>
                      <p className="text-purple-100">
                        Serial #{product.serial_number || "N/A"}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            product.status
                              ? {
                                  active: "bg-green-100 text-green-800",
                                  inactive: "bg-red-100 text-red-800",
                                  warranty: "bg-blue-100 text-blue-800",
                                }[product.status.toLowerCase()] ||
                                "bg-gray-100 text-gray-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {product.status || "Unknown"}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-purple-800">
                          {formatCurrency(product.selling_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Product Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.product_name && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Product Name
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {product.product_name}
                        </p>
                      </div>
                    )}
                    {product.company && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Company
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {product.company}
                        </p>
                      </div>
                    )}
                    {product.model_number && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Model Number
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {product.model_number}
                        </p>
                      </div>
                    )}
                    {product.serial_number && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Serial Number
                        </label>
                        <p className="text-sm font-medium text-gray-900">
                          {product.serial_number}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Pricing Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <label className="block text-xs font-medium text-blue-600 mb-1">
                        Selling Price
                      </label>
                      <p className="text-sm font-medium text-blue-800">
                        {formatCurrency(product.selling_price)}
                      </p>
                    </div>
                    {product.cost_price && (
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <label className="block text-xs font-medium text-green-600 mb-1">
                          Cost Price
                        </label>
                        <p className="text-sm font-medium text-green-800">
                          {formatCurrency(product.cost_price)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Warranty Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Warranty Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.warranty_end_date && (
                      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <label className="block text-xs font-medium text-yellow-600 mb-1">
                          Warranty End Date
                        </label>
                        <p className="text-sm font-medium text-yellow-800">
                          {formatDate(product.warranty_end_date)}
                        </p>
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 border ${getStatusColor(product.status).includes("green") ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}
                    >
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Status
                      </label>
                      <p
                        className={`text-sm font-medium ${getStatusColor(product.status).includes("green") ? "text-green-800" : "text-gray-800"}`}
                      >
                        {product.status || "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Integration */}
              {product.hasServicePlan && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Service Integration
                    </h3>
                    <ServiceIntegration
                      itemId={product._id}
                      invoiceId={product.invoice_id}
                      product={product}
                      size="large"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Actions */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-4">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    {product.invoice_id && (
                      <button
                        onClick={() =>
                          navigate(`${ROUTES.INVOICES}/${product.invoice_id}`)
                        }
                        className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group"
                      >
                        <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                          View Invoice
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => window.print()}
                      className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group"
                    >
                      <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <Package className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        Print Details
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductView;
