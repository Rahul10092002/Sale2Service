import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();

  const routeLabels = {
    "/products": "Products",
    "/dashboard": "Dashboard",
    "/invoices": "Invoices",
    "/customers": "Customers",
  };

  const from = location.state?.from || "/customers";
  const label =
    location.state?.label || routeLabels[location.state?.from] || "Customers";

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
      <div className="compact min-h-screen bg-gray-50 dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-2 py-3">
          {/* Header */}
          <div className="mb-3">
            <Button
              onClick={() => navigate(from)}
              variant="outline"
              className="mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {label}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-3">
              {/* Customer Header Card */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl px-3 py-2 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-lg font-bold mb-1">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Basic Information */}
                <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border p-3">
                  <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Full Name
                      </label>
                      <p className="text-xs text-ink-base dark:text-slate-100">{customer.full_name}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        WhatsApp Number
                      </label>
                      <p className="text-xs text-ink-base dark:text-slate-100">
                        {customer.whatsapp_number}
                      </p>
                    </div>
                    {customer.alternate_phone && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Alternate Phone
                        </label>
                        <p className="text-xs text-gray-900">
                          {customer.alternate_phone}
                        </p>
                      </div>
                    )}
                    {customer.email && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Email
                        </label>
                        <p className="text-xs text-gray-900">{customer.email}</p>
                      </div>
                    )}
                    {customer.date_of_birth && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Date of Birth
                        </label>
                        <p className="text-xs text-gray-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(
                            customer.date_of_birth,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {customer.anniversary_date && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Anniversary Date
                        </label>
                        <p className="text-xs text-gray-900 flex items-center gap-2">
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
                <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border p-3">
                  <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-600" />
                    Address Information
                  </h3>
                  <div className="space-y-4">
                    {customer.address ? (
                      <>
                        {customer.address.line1 && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Address Line 1
                            </label>
                            <p className="text-xs text-gray-900">
                              {customer.address.line1}
                            </p>
                          </div>
                        )}
                        {customer.address.line2 && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Address Line 2
                            </label>
                            <p className="text-xs text-gray-900">
                              {customer.address.line2}
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          {customer.address.city && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                City
                              </label>
                              <p className="text-xs text-gray-900">
                                {customer.address.city}
                              </p>
                            </div>
                          )}
                          {customer.address.state && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                State
                              </label>
                              <p className="text-xs text-gray-900">
                                {customer.address.state}
                              </p>
                            </div>
                          )}
                        </div>
                        {customer.address.pincode && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Pincode
                            </label>
                            <p className="text-xs text-gray-900">
                              {customer.address.pincode}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-ink-secondary dark:text-slate-400 text-sm">
                        No address information provided
                      </p>
                    )}
                  </div>
                </div>

                {/* Business Information */}
                <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border p-3">
                  <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    Business Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-ink-secondary dark:text-slate-400 mb-1">
                        Customer Type
                      </label>
                      <span className="inline-flex px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                        {customer.customer_type || "RETAIL"}
                      </span>
                    </div>
                    {customer.gst_number && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          GST Number
                        </label>
                        <p className="text-xs text-ink-base dark:text-slate-100">{customer.gst_number}</p>
                      </div>
                    )}
                    {customer.preferred_language && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Preferred Language
                        </label>
                        <p className="text-xs text-ink-base dark:text-slate-100">
                          {customer.preferred_language}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Created At
                      </label>
                      <p className="text-xs text-ink-base dark:text-slate-100">
                        {customer.createdAt
                          ? new Date(customer.createdAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {customer.notes && (
                  <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border p-3">
                    <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-orange-600" />
                      Notes
                    </h3>
                    <p className="text-ink-secondary dark:text-slate-300">{customer.notes}</p>
                  </div>
                )}
              </div>

              {/* Related Invoices */}
              <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border p-3">
                <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Related Invoices ({pagination.total})
                </h3>
                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : !invoices.length ? (
                  <div className="text-center py-8">
                    <div className="text-ink-secondary dark:text-slate-400 text-lg">
                      No invoices found
                    </div>
                    <div className="text-ink-muted dark:text-slate-500 text-sm mt-2">
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
                  <div className="space-y-3">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-dark-border">
                            <th className="text-left py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400 whitespace-nowrap">Invoice No</th>
                            <th className="text-left py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400 whitespace-nowrap">Date</th>
                            <th className="text-left py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400 whitespace-nowrap">Total</th>
                            <th className="text-left py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400 whitespace-nowrap">Payment</th>
                            <th className="text-left py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400 whitespace-nowrap">Status</th>
                            <th className="text-left py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400 whitespace-nowrap">Created By</th>
                            <th className="text-right py-2 px-2 font-medium text-xs text-ink-secondary dark:text-slate-400 whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr
                              key={inv._id}
                              className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-subtle"
                            >
                              <td
                                className="py-2 px-2 text-xs font-semibold text-ink-base dark:text-slate-200 whitespace-nowrap cursor-pointer hover:underline"
                                onClick={() =>
                                  navigate(`${ROUTES.INVOICES}/${inv._id}`, {
                                    state: {
                                      from: location.pathname,
                                      label: "Customers",
                                    },
                                  })
                                }
                              >
                                {inv.invoice_number}
                              </td>
                              <td className="py-2 px-2 text-xs text-ink-secondary dark:text-slate-400 whitespace-nowrap">
                                {new Date(inv.invoice_date).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-2 text-xs font-bold text-ink-base dark:text-slate-100 whitespace-nowrap">
                                ₹{inv.total_amount}
                              </td>
                              <td className="py-2 px-2 text-xs text-ink-secondary dark:text-slate-400 whitespace-nowrap">
                                {inv.payment_mode}
                              </td>
                              <td className="py-2 px-2 whitespace-nowrap">
                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${inv.payment_status === "PAID" ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300" : inv.payment_status === "PARTIAL" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200" : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"}`}>
                                  {inv.payment_status}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-[10px] text-ink-muted dark:text-slate-500 whitespace-nowrap">
                                {inv.created_by?.name || inv.created_by || "-"}
                              </td>
                              <td className="py-2 px-2 text-right">
                                <div className="flex items-center justify-end gap-1 min-w-[max-content]">
                                  <button
                                    onClick={() =>
                                      navigate(`${ROUTES.INVOICES}/${inv._id}`, {
                                        state: {
                                          from: location.pathname,
                                          label: "Customers",
                                        },
                                      })
                                    }
                                    className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
                                    title="View Invoice"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => navigate(`${ROUTES.INVOICES}/${inv._id}/edit`)}
                                    className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                                    title="Edit Invoice"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
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
                                    className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                                    title="Delete Invoice"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.pages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-dark-border">
                        <div className="text-sm text-ink-muted dark:text-slate-500">
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
                          <span className="text-sm text-ink-secondary dark:text-slate-400 mx-2">
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
              <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-lg shadow-sm p-6 sticky top-6">
                <h3 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg ${action.bgColor} ${action.hoverColor} transition-colors`}
                    >
                      <action.icon className={`w-4 h-4 ${action.color}`} />
                      <span className={`text-xs font-medium ${action.color}`}>
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
