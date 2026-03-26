import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "../../features/ui/uiSlice.js";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  Edit3,
  Trash2,
  UserPlus,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import {
  useGetCustomerByIdQuery,
  useDeleteCustomerMutation,
} from "../../features/customers/customerApi.js";
import {
  useGetInvoicesQuery,
  useDeleteInvoiceMutation,
} from "../../features/invoices/invoiceApi.js";
import Button from "../../components/ui/Button.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { ROUTES } from "../../utils/constants.js";

const CustomerView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: customerResp,
    isLoading: customerLoading,
    error,
  } = useGetCustomerByIdQuery(id);

  const [invoicePage, setInvoicePage] = useState(1);
  const {
    data: invoicesResp,
    isLoading: invoicesLoading,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery({ customer_id: id, page: invoicePage, limit: 10 });

  const [deleteInvoice] = useDeleteInvoiceMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();
  const dispatch = useDispatch();

  const customer = customerResp?.customer;
  // prefer paginated invoicesResp if available, else fallback to invoices returned with customerResp
  const invoices = invoicesResp?.invoices?.length
    ? invoicesResp.invoices
    : customerResp?.invoices || [];
  const pagination = invoicesResp?.pagination ||
    customerResp?.pagination || {
      page: 1,
      limit: invoices.length || 10,
      total: invoices.length || 0,
      pages: 1,
    };

  const handleDeleteCustomer = async () => {
    if (
      window.confirm(
        "Delete this customer? This will remove related invoices as well.",
      )
    ) {
      try {
        await deleteCustomer(id).unwrap();
        navigate(ROUTES.CUSTOMERS);
      } catch (err) {
        console.error(err);
        dispatch(
          showToast({ message: "Failed to delete customer", type: "error" }),
        );
      }
    }
  };

  const quickActions = [
    {
      icon: Edit3,
      label: "Edit Customer",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      action: () => navigate(`${ROUTES.CUSTOMERS}/${id}/edit`),
    },
    {
      icon: FileText,
      label: "Create Invoice",
      color: "text-green-600",
      bgColor: "bg-green-50",
      hoverColor: "hover:bg-green-100",
      action: () => navigate(`${ROUTES.INVOICES}/create?customer_id=${id}`),
    },
    {
      icon: MessageSquare,
      label: "Send Message",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      hoverColor: "hover:bg-purple-100",
      action: () => {
        const phone = customer?.whatsapp_number?.replace(/[^\d]/g, "");
        if (phone) {
          window.open(`https://wa.me/${phone}`, "_blank");
        }
      },
    },
    {
      icon: Trash2,
      label: "Delete Customer",
      color: "text-red-600",
      bgColor: "bg-red-50",
      hoverColor: "hover:bg-red-100",
      action: handleDeleteCustomer,
    },
  ];

  if (customerLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </>
    );
  }

  if (error || !customer) {
    return (
      <>
        <div className="p-6">
          <Alert
            type="error"
            title="Error Loading Customer"
            message={error?.data?.message || "Customer not found"}
          />
          <Button
            onClick={() => navigate(ROUTES.CUSTOMERS)}
            className="mt-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Customers
          </Button>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <Button
              onClick={() => navigate(ROUTES.CUSTOMERS)}
              variant="outline"
              className="mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Customers
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Customer Header Card */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-8 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">
                      {customer.full_name}
                    </h1>
                    <div className="flex items-center gap-4 text-blue-100">
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {customer.whatsapp_number}
                      </span>
                      {customer.email && (
                        <span className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                      {customer.customer_type || "RETAIL"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Full Name
                      </label>
                      <p className="text-gray-900">{customer.full_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        WhatsApp Number
                      </label>
                      <p className="text-gray-900">
                        {customer.whatsapp_number}
                      </p>
                    </div>
                    {customer.alternate_phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Alternate Phone
                        </label>
                        <p className="text-gray-900">
                          {customer.alternate_phone}
                        </p>
                      </div>
                    )}
                    {customer.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Email
                        </label>
                        <p className="text-gray-900">{customer.email}</p>
                      </div>
                    )}
                    {customer.date_of_birth && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Date of Birth
                        </label>
                        <p className="text-gray-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(
                            customer.date_of_birth,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {customer.anniversary_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Anniversary Date
                        </label>
                        <p className="text-gray-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(
                            customer.anniversary_date,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address Information */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-600" />
                    Address Information
                  </h3>
                  <div className="space-y-4">
                    {customer.address ? (
                      <>
                        {customer.address.line1 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">
                              Address Line 1
                            </label>
                            <p className="text-gray-900">
                              {customer.address.line1}
                            </p>
                          </div>
                        )}
                        {customer.address.line2 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">
                              Address Line 2
                            </label>
                            <p className="text-gray-900">
                              {customer.address.line2}
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          {customer.address.city && (
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">
                                City
                              </label>
                              <p className="text-gray-900">
                                {customer.address.city}
                              </p>
                            </div>
                          )}
                          {customer.address.state && (
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">
                                State
                              </label>
                              <p className="text-gray-900">
                                {customer.address.state}
                              </p>
                            </div>
                          )}
                        </div>
                        {customer.address.pincode && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">
                              Pincode
                            </label>
                            <p className="text-gray-900">
                              {customer.address.pincode}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No address information provided
                      </p>
                    )}
                  </div>
                </div>

                {/* Business Information */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    Business Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Customer Type
                      </label>
                      <span className="inline-flex px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                        {customer.customer_type || "RETAIL"}
                      </span>
                    </div>
                    {customer.gst_number && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          GST Number
                        </label>
                        <p className="text-gray-900">{customer.gst_number}</p>
                      </div>
                    )}
                    {customer.preferred_language && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Preferred Language
                        </label>
                        <p className="text-gray-900">
                          {customer.preferred_language}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Created At
                      </label>
                      <p className="text-gray-900">
                        {customer.createdAt
                          ? new Date(customer.createdAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {customer.notes && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-orange-600" />
                      Notes
                    </h3>
                    <p className="text-gray-700">{customer.notes}</p>
                  </div>
                )}
              </div>

              {/* Related Invoices */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Related Invoices ({pagination.total})
                </h3>
                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : !invoices.length ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-lg">
                      No invoices found
                    </div>
                    <div className="text-gray-400 text-sm mt-2">
                      Create the first invoice for this customer
                    </div>
                    <Button
                      onClick={() =>
                        navigate(`${ROUTES.INVOICES}/create?customer_id=${id}`)
                      }
                      className="mt-4 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Create Invoice
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invoices.map((inv) => (
                      <div
                        key={inv._id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {inv.invoice_number}
                          </div>
                          <div className="text-sm text-gray-600">
                            Date:{" "}
                            {new Date(inv.invoice_date).toLocaleDateString()} •
                            Payment: {inv.payment_mode} • Status:{" "}
                            {inv.payment_status}
                          </div>
                          <div className="text-sm text-gray-500">
                            Created by:{" "}
                            {inv.created_by?.name || inv.created_by || "-"}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-bold text-lg text-gray-900">
                            ₹{inv.total_amount}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                navigate(`${ROUTES.INVOICES}/${inv._id}`)
                              }
                              className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded"
                              title="View Invoice"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                navigate(`${ROUTES.INVOICES}/${inv._id}/edit`)
                              }
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
                              title="Edit Invoice"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    "Delete this invoice? This action cannot be undone.",
                                  )
                                ) {
                                  try {
                                    await deleteInvoice(inv._id).unwrap();
                                    refetchInvoices();
                                  } catch (err) {
                                    console.error(err);
                                    dispatch(
                                      showToast({
                                        message: "Failed to delete invoice",
                                        type: "error",
                                      }),
                                    );
                                  }
                                }
                              }}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination */}
                    {pagination && pagination.pages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                          Showing page {pagination.page} of {pagination.pages}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() =>
                              setInvoicePage((p) => Math.max(1, p - 1))
                            }
                            disabled={invoicePage <= 1}
                            variant="outline"
                            size="sm"
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-gray-700 mx-2">
                            {pagination.page}
                          </span>
                          <Button
                            onClick={() =>
                              setInvoicePage((p) =>
                                Math.min(pagination.pages, p + 1),
                              )
                            }
                            disabled={invoicePage >= pagination.pages}
                            variant="outline"
                            size="sm"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg ${action.bgColor} ${action.hoverColor} transition-colors`}
                    >
                      <action.icon className={`w-5 h-5 ${action.color}`} />
                      <span className={`text-sm font-medium ${action.color}`}>
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerView;
