import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions.js";
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
import { useDeleteGuard } from "../../context/DeleteGuardContext.jsx";
import { ROUTES } from "../../utils/constants.js";
import { formatDate } from "../../utils/date.js";

const CustomerView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { confirmDelete } = useDeleteGuard();

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
  const [invoiceLimit, setInvoiceLimit] = useState(10);
  const {
    data: invoicesResp,
    isLoading: invoicesLoading,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery({ customer_id: id, page: invoicePage, limit: invoiceLimit });

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
    confirmDelete({
      itemName: customer?.full_name || "Customer",
      itemType: "Customer",
      onConfirm: async () => {
        try {
          await deleteCustomer(id).unwrap();
          navigate(ROUTES.CUSTOMERS);
        } catch (err) {
          console.error(err);
          dispatch(
            showToast({ message: "Failed to delete customer", type: "error" }),
          );
        }
      },
    });
  };

  const quickActions = [
    {
      icon: Edit3,
      label: "Edit Customer",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      action: () => navigate(`${ROUTES.CUSTOMERS}/${id}/edit`),
      show: canEdit("customers"),
    },
    {
      icon: FileText,
      label: "Create Invoice",
      color: "text-green-600",
      bgColor: "bg-green-50",
      hoverColor: "hover:bg-green-100",
      action: () => navigate(`${ROUTES.NEW_INVOICE}?customer_id=${id}`),
      show: canCreate("invoices"),
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
      show: true,
    },
    {
      icon: Trash2,
      label: "Delete Customer",
      color: "text-red-600",
      bgColor: "bg-red-50",
      hoverColor: "hover:bg-red-100",
      action: handleDeleteCustomer,
      show: canDelete("customers"),
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
          {/* Header */}
          <div className="bg-white dark:bg-dark-card p-3.5 sm:p-4 rounded-xl shadow-xs border border-gray-200 dark:border-dark-border mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(from)}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <ArrowLeft size={14} className="mr-1.5" />
                Back to {label}
              </button>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Customer Details
              </h1>
            </div>
            {/* Quick Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {canCreate("invoices") && (
                <button
                  onClick={() => navigate(`${ROUTES.NEW_INVOICE}?customer_id=${id}`)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-2xs transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> Create Invoice
                </button>
              )}
              {customer?.whatsapp_number && (
                <button
                  onClick={() => {
                    const phone = customer?.whatsapp_number?.replace(/[^\d]/g, "");
                    if (phone) window.open(`https://wa.me/${phone}`, "_blank");
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </button>
              )}
              {canEdit("customers") && (
                <button
                  onClick={() => navigate(`${ROUTES.CUSTOMERS}/${id}/edit`)}
                  className="inline-flex items-center justify-center p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Edit Customer"
                >
                  <Edit3 className="w-4 h-4 text-blue-600" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-3">
              {/* Customer Header Card */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-3.5 sm:p-5 text-white shadow-sm border border-blue-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-base sm:text-lg font-bold leading-tight truncate">
                        {customer.full_name}
                      </h1>
                      <div className="flex items-center gap-3 text-xs text-blue-100 flex-wrap mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span className="font-mono">{customer.whatsapp_number}</span>
                        </span>
                        {customer.email && (
                          <span className="flex items-center gap-1 truncate max-w-[200px]">
                            <Mail className="w-3 h-3" />
                            <span>{customer.email}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="self-start sm:self-auto pt-2 sm:pt-0 border-t border-blue-500/40 sm:border-0 w-full sm:w-auto flex justify-between sm:justify-end items-center">
                    <span className="text-[11px] text-blue-100 sm:hidden">Customer Type</span>
                    <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-full bg-white/90 text-blue-900 shadow-2xs">
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
                          {formatDate(customer.date_of_birth)}
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
                          {formatDate(customer.anniversary_date)}
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
                        {formatDate(customer.createdAt)}
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
                        navigate(`${ROUTES.NEW_INVOICE}?customer_id=${id}`)
                      }
                      className="mt-4 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Create Invoice
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* MOBILE CARD VIEW (< md screens) – ZERO horizontal scroll */}
                    <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                      {invoices.map((inv) => (
                        <div key={inv._id} className="p-3 space-y-2 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="font-bold text-xs text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                              onClick={() =>
                                navigate(`${ROUTES.INVOICES}/${inv._id}`, {
                                  state: { from: location.pathname, label: "Customers" },
                                })
                              }
                            >
                              {inv.invoice_number}
                            </span>
                            <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                              ₹{inv.total_amount}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <span>{formatDate(inv.invoice_date)}</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{inv.payment_mode || "CASH"}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${inv.payment_status === "PAID" ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300" : inv.payment_status === "PARTIAL" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200" : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"}`}>
                              {inv.payment_status}
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  navigate(`${ROUTES.INVOICES}/${inv._id}`, {
                                    state: { from: location.pathname, label: "Customers" },
                                  })
                                }
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
                                title="View Invoice"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              {canEdit("invoices") && (
                                <button
                                  onClick={() => navigate(`${ROUTES.INVOICES}/${inv._id}/edit`)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                                  title="Edit Invoice"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete("invoices") && (
                                <button
                                  onClick={() => {
                                    confirmDelete({
                                      itemName: inv.invoice_number || `Invoice #${inv._id}`,
                                      itemType: "Invoice",
                                      onConfirm: async () => {
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
                                      },
                                    });
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                                  title="Delete Invoice"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* DESKTOP TABLE VIEW (≥ md screens) */}
                    <div className="hidden md:block overflow-x-auto w-full">
                      <table className="w-full text-xs text-gray-700 dark:text-gray-200">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-gray-900/50">
                            <th className="text-left py-2.5 px-3 font-semibold text-xs text-gray-600 dark:text-slate-400">Invoice No</th>
                            <th className="text-left py-2.5 px-3 font-semibold text-xs text-gray-600 dark:text-slate-400">Date</th>
                            <th className="text-left py-2.5 px-3 font-semibold text-xs text-gray-600 dark:text-slate-400">Total</th>
                            <th className="text-left py-2.5 px-3 font-semibold text-xs text-gray-600 dark:text-slate-400">Payment</th>
                            <th className="text-left py-2.5 px-3 font-semibold text-xs text-gray-600 dark:text-slate-400">Status</th>
                            <th className="text-left py-2.5 px-3 font-semibold text-xs text-gray-600 dark:text-slate-400">Created By</th>
                            <th className="text-right py-2.5 px-3 font-semibold text-xs text-gray-600 dark:text-slate-400">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr
                              key={inv._id}
                              className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-subtle transition-colors"
                            >
                              <td
                                className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
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
                              <td className="py-2.5 px-3 text-gray-600 dark:text-slate-400">
                                {formatDate(inv.invoice_date)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{inv.total_amount}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600 dark:text-slate-400">
                                {inv.payment_mode}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${inv.payment_status === "PAID" ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300" : inv.payment_status === "PARTIAL" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200" : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"}`}>
                                  {inv.payment_status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-gray-500 dark:text-slate-500">
                                {inv.created_by?.name || inv.created_by || "-"}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() =>
                                      navigate(`${ROUTES.INVOICES}/${inv._id}`, {
                                        state: {
                                          from: location.pathname,
                                          label: "Customers",
                                        },
                                      })
                                    }
                                    className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
                                    title="View Invoice"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  {canEdit("invoices") && (
                                    <button
                                      onClick={() => navigate(`${ROUTES.INVOICES}/${inv._id}/edit`)}
                                      className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                                      title="Edit Invoice"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {canDelete("invoices") && (
                                    <button
                                      onClick={() => {
                                        confirmDelete({
                                          itemName: inv.invoice_number || `Invoice #${inv._id}`,
                                          itemType: "Invoice",
                                          onConfirm: async () => {
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
                                          },
                                        });
                                      }}
                                      className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                                      title="Delete Invoice"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {pagination && (pagination.total > 0 || pagination.pages > 1) && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-dark-border">
                        <div className="flex items-center gap-4 text-xs text-ink-muted dark:text-slate-400">
                          <span>
                            Showing {(pagination.page - 1) * (pagination.limit || invoiceLimit) + 1} to{" "}
                            {Math.min(
                              pagination.page * (pagination.limit || invoiceLimit),
                              pagination.total || invoices.length,
                            )}{" "}
                            of {pagination.total || invoices.length} invoices
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span>Rows per page:</span>
                            <select
                              value={invoiceLimit}
                              onChange={(e) => {
                                setInvoiceLimit(Number(e.target.value));
                                setInvoicePage(1);
                              }}
                              className="px-2 py-1 text-xs border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-input text-ink-base dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                        </div>

                        {pagination.pages > 1 && (
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
                            <span className="text-xs text-ink-secondary dark:text-slate-400 mx-2">
                              {pagination.page} / {pagination.pages}
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
                        )}
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
                  {quickActions.filter(a => a.show).map((action, index) => (
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
