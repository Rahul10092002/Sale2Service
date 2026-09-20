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
  CreditCard,
  MessageSquare,
  BookOpen,
  Share2,
  Filter,
  Coins,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  X,
  Globe,
  Hash,
  Building2,
} from "lucide-react";
import {
  useGetCustomerByIdQuery,
  useGetCustomerLedgerQuery,
  useDeleteCustomerMutation,
} from "../../features/customers/customerApi.js";
import { useGetCurrentUserQuery } from "../../features/auth/authApi.js";
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

  // Fetch current user & shop from auth state
  const { data: authData } = useGetCurrentUserQuery();

  // Ledger Filter States
  const [ledgerStartDate, setLedgerStartDate] = useState("");
  const [ledgerEndDate, setLedgerEndDate] = useState("");
  const [ledgerStatus, setLedgerStatus] = useState("ALL");

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

  const {
    data: ledgerResp,
    isLoading: ledgerLoading,
    refetch: refetchLedger,
  } = useGetCustomerLedgerQuery(
    {
      id,
      startDate: ledgerStartDate,
      endDate: ledgerEndDate,
      status: ledgerStatus,
    },
    { skip: !id }
  );

  const [deleteInvoice] = useDeleteInvoiceMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();
  const dispatch = useDispatch();

  const customer = customerResp?.customer;

  const ledgerSummary = ledgerResp?.summary || {
    total_invoiced: 0,
    total_paid: 0,
    total_due: 0,
    total_invoices: 0,
    paid_count: 0,
    partial_count: 0,
    unpaid_count: 0,
  };

  const ledgerEntries = ledgerResp?.ledger_entries || [];

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

  const handleShareWhatsAppLedger = () => {
    if (!customer) return;
    const phone = customer.whatsapp_number?.replace(/[^\d]/g, "");
    if (!phone) {
      dispatch(showToast({ message: "WhatsApp number not available", type: "error" }));
      return;
    }

    const dueVal = ledgerSummary.total_due || 0;
    const dueStr = dueVal.toLocaleString("en-IN");
    const paidStr = (ledgerSummary.total_paid || 0).toLocaleString("en-IN");
    const totalStr = (ledgerSummary.total_invoiced || 0).toLocaleString("en-IN");
    const shopNameHindi =
      authData?.shop?.shop_name_hi ||
      authData?.shop?.name_hi ||
      authData?.shop?.name ||
      authData?.user?.shop_name ||
      "";

    let msg = `*खाता विवरण*\n`;
    msg += `-----------------------------------\n`;
    msg += `*ग्राहक:* ${customer.full_name}\n`;
    msg += `*फोन:* ${customer.whatsapp_number}\n`;
    if (customer.gst_number) {
      msg += `*GSTIN:* ${customer.gst_number}\n`;
    }
    msg += `-----------------------------------\n`;
    msg += `*भुगतान की जानकारी*\n`;
    msg += `• कुल बिल: ₹${totalStr}\n`;
    msg += `• कुल भुगतान: ₹${paidStr}\n`;
    msg += `• *बकाया राशि: ₹${dueStr}*\n`;
    msg += `-----------------------------------\n`;
    msg += `*हाल के लेन-देन*\n`;

    const recent = (ledgerEntries || []).slice(-5).reverse();
    if (recent.length === 0) {
      msg += `(कोई लेन-देन नहीं मिला)\n`;
    } else {
      recent.forEach((item) => {
        const invDate = formatDate(item.invoice_date);
        const invBilled = (item.debit || 0).toLocaleString("en-IN");
        const invPaid = (item.credit || 0).toLocaleString("en-IN");
        const invBal = (item.invoice_balance || 0).toLocaleString("en-IN");
        msg += `• *${item.invoice_number}* (${invDate})\n`;
        msg += `   बिल: ₹${invBilled} | भुगतान: ₹${invPaid} | बकाया: ₹${invBal}\n`;
      });
    }

    msg += `-----------------------------------\n`;
    if (dueVal > 0) {
      msg += `*सूचना:* कृपया *₹${dueStr}* की बकाया राशि जल्द से जल्द जमा करने का कष्ट करें。\n\n`;
    }

    if (shopNameHindi) {
      msg += `${shopNameHindi} के साथ व्यापार करने के लिए धन्यवाद! 🙏`;
    } else {
      msg += `हमारे साथ व्यापार करने के लिए धन्यवाद! 🙏`;
    }

    let formattedPhone = phone;
    if (phone.length === 10) {
      formattedPhone = `91${phone}`;
    }

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };


  const clearLedgerFilters = () => {
    setLedgerStartDate("");
    setLedgerEndDate("");
    setLedgerStatus("ALL");
  };

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !customer) {
    return (
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
    );
  }

  // Construct full address string
  const fullAddress = customer.address
    ? [
        customer.address.line1,
        customer.address.line2,
        customer.address.city,
        customer.address.state,
        customer.address.pincode ? `- ${customer.address.pincode}` : "",
      ]
        .filter(Boolean)
        .join(", ")
    : "No address specified";

  return (
    <div className="compact min-h-screen bg-gray-50 dark:bg-dark-bg py-3">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 space-y-3">
        {/* Top Header Bar */}
        <div className="bg-white dark:bg-dark-card p-3 sm:p-4 rounded-xl shadow-xs border border-gray-200 dark:border-dark-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(from)}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Back to {label}
            </button>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Customer Profile & Ledger
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {canCreate("invoices") && (
              <button
                onClick={() => navigate(`${ROUTES.NEW_INVOICE}?customer_id=${id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-2xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Create Invoice
              </button>
            )}
            {customer?.whatsapp_number && (
              <button
                onClick={handleShareWhatsAppLedger}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                title="Share Statement on WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Statement
              </button>
            )}
            {canEdit("customers") && (
              <button
                onClick={() => navigate(`${ROUTES.CUSTOMERS}/${id}/edit`)}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                title="Edit Customer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {canDelete("customers") && (
              <button
                onClick={handleDeleteCustomer}
                className="inline-flex items-center gap-1 p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                title="Delete Customer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── CONSOLIDATED SINGLE CUSTOMER DETAILS CARD ── */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-xs p-4 space-y-3">
          {/* Top Banner Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-dark-border gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {customer.full_name}
                  </h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    customer.customer_type === "BUSINESS"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                      : customer.customer_type === "DEALER"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  }`}>
                    {customer.customer_type || "RETAIL"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">
                  Customer ID: #{customer._id}
                </p>
              </div>
            </div>

            {/* Financial Status Pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {ledgerSummary.total_due > 0 ? (
                <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Outstanding: ₹{ledgerSummary.total_due.toLocaleString("en-IN")}</span>
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All Dues Settled</span>
                </div>
              )}
            </div>
          </div>

          {/* Details Compact Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Contact Info */}
            <div className="space-y-1.5 bg-gray-50/70 dark:bg-dark-input/50 p-2.5 rounded-lg border border-gray-100 dark:border-dark-border/50">
              <span className="font-bold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wide flex items-center gap-1">
                <Phone className="w-3 h-3 text-blue-500" /> Contact Details
              </span>
              <p className="font-mono text-gray-900 dark:text-white font-medium">
                📱 {customer.whatsapp_number}
              </p>
              {customer.alternate_phone && (
                <p className="text-gray-600 dark:text-slate-300 font-mono">
                  📞 Alt: {customer.alternate_phone}
                </p>
              )}
              {customer.email && (
                <p className="text-gray-600 dark:text-slate-300 truncate" title={customer.email}>
                  ✉️ {customer.email}
                </p>
              )}
            </div>

            {/* Business & Tax */}
            <div className="space-y-1.5 bg-gray-50/70 dark:bg-dark-input/50 p-2.5 rounded-lg border border-gray-100 dark:border-dark-border/50">
              <span className="font-bold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wide flex items-center gap-1">
                <Building2 className="w-3 h-3 text-purple-500" /> Business Info
              </span>
              <p className="text-gray-800 dark:text-slate-200">
                GST: <span className="font-mono font-bold">{customer.gst_number || "N/A"}</span>
              </p>
              <p className="text-gray-600 dark:text-slate-300">
                Language: <span className="font-medium">{customer.preferred_language || "ENGLISH"}</span>
              </p>
              <p className="text-gray-500 dark:text-slate-400 text-[11px]">
                Joined: {formatDate(customer.createdAt)}
              </p>
            </div>

            {/* Address */}
            <div className="space-y-1.5 bg-gray-50/70 dark:bg-dark-input/50 p-2.5 rounded-lg border border-gray-100 dark:border-dark-border/50 sm:col-span-2 lg:col-span-2">
              <span className="font-bold text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-3 h-3 text-green-500" /> Address & Events
              </span>
              <p className="text-gray-800 dark:text-slate-200 leading-relaxed">
                📍 {fullAddress}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-gray-600 dark:text-slate-400 pt-0.5">
                {customer.date_of_birth && (
                  <span>🎂 DOB: {formatDate(customer.date_of_birth)}</span>
                )}
                {customer.anniversary_date && (
                  <span>💍 Anniversary: {formatDate(customer.anniversary_date)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Notes Callout (if present) */}
          {customer.notes && (
            <div className="p-2 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold">Notes:</span> {customer.notes}
            </div>
          )}
        </div>

        {/* ── FINANCIAL LEDGER KPI SUMMARY CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Billed */}
          <div className="bg-white dark:bg-dark-card p-3.5 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                Total Invoiced (Billed)
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                ₹{ledgerSummary.total_invoiced.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                {ledgerSummary.total_invoices} total transactions
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Coins className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Total Paid */}
          <div className="bg-white dark:bg-dark-card p-3.5 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                Total Received (Paid)
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                ₹{ledgerSummary.total_paid.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                {ledgerSummary.paid_count} fully paid invoices
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Net Outstanding Balance */}
          <div className={`p-3.5 rounded-xl border shadow-xs flex items-center justify-between transition-colors ${
            ledgerSummary.total_due > 0
              ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
              : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
          }`}>
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-slate-300">
                Net Outstanding Dues
              </p>
              <p className={`text-lg font-bold mt-0.5 ${
                ledgerSummary.total_due > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-emerald-700 dark:text-emerald-300"
              }`}>
                ₹{ledgerSummary.total_due.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                {ledgerSummary.total_due > 0 ? "Pending customer payment" : "All dues settled"}
              </p>
            </div>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              ledgerSummary.total_due > 0
                ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          {/* Card 4: Status Breakdown */}
          <div className="bg-white dark:bg-dark-card p-3.5 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                Invoice Breakdown
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-bold flex-wrap">
                <span className="text-emerald-600">{ledgerSummary.paid_count} Paid</span>
                <span>•</span>
                <span className="text-amber-600">{ledgerSummary.partial_count} Partial</span>
                <span>•</span>
                <span className="text-red-600">{ledgerSummary.unpaid_count} Unpaid</span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                {ledgerSummary.total_invoices} total invoices
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ── RUNNING BALANCE LEDGER TABLE / CARDS ── */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-xs p-4 space-y-3">
          {/* Header & Filter Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 dark:border-dark-border pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Transaction Ledger & Running Balance ({ledgerEntries.length})
              </h3>
            </div>

            {/* Filter Toolbar */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-indigo-500" /> Filter:
              </span>

              {/* Start Date */}
              <input
                type="date"
                value={ledgerStartDate}
                onChange={(e) => setLedgerStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-input text-gray-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                title="Start Date"
              />
              <span className="text-gray-400">to</span>
              {/* End Date */}
              <input
                type="date"
                value={ledgerEndDate}
                onChange={(e) => setLedgerEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-input text-gray-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                title="End Date"
              />

              {/* Status Selector */}
              <select
                value={ledgerStatus}
                onChange={(e) => setLedgerStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-input text-gray-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="UNPAID">Unpaid Only</option>
                <option value="PARTIAL">Partial Only</option>
                <option value="PAID">Paid Only</option>
              </select>

              {(ledgerStartDate || ledgerEndDate || ledgerStatus !== "ALL") && (
                <button
                  onClick={clearLedgerFilters}
                  className="inline-flex items-center gap-1 px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors font-medium text-[11px]"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}

              
            </div>
          </div>

          {ledgerLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : !ledgerEntries.length ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-dark-border rounded-xl">
              <Coins className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                No ledger transactions match the selected criteria
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Try clearing date or status filters
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE LEDGER CARDS (< md screens) */}
              <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {ledgerEntries.map((entry) => (
                  <div key={entry._id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="font-bold text-xs text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                        onClick={() =>
                          navigate(`${ROUTES.INVOICES}/${entry._id}`, {
                            state: { from: location.pathname, label: "Customers" },
                          })
                        }
                      >
                        {entry.invoice_number}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        entry.payment_status === "PAID"
                          ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                          : entry.payment_status === "PARTIAL"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200"
                          : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                      }`}>
                        {entry.payment_status}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center justify-between">
                      <span>📅 {formatDate(entry.invoice_date)}</span>
                      <span className="truncate max-w-[150px]">{entry.items_summary}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-gray-50 dark:bg-dark-input p-2 rounded-lg text-center text-[11px]">
                      <div>
                        <span className="block text-[10px] text-gray-400">Debit (Billed)</span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{entry.debit}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-emerald-600">Credit (Paid)</span>
                        <span className="font-bold text-emerald-600">₹{entry.credit}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-indigo-600">Running Bal</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-300">
                          ₹{entry.running_balance}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP LEDGER TABLE (≥ md screens) */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input/60 text-gray-600 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Invoice No</th>
                      <th className="py-2.5 px-3 font-semibold">Services / Description</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Debit (Billed)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Credit (Paid)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Inv. Balance</th>
                      <th className="py-2.5 px-3 font-semibold text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                        Running Balance
                      </th>
                      <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {ledgerEntries.map((entry) => (
                      <tr
                        key={entry._id}
                        className="hover:bg-gray-50/80 dark:hover:bg-dark-subtle transition-colors"
                      >
                        <td className="py-2.5 px-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(entry.invoice_date)}
                        </td>
                        <td
                          className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline whitespace-nowrap"
                          onClick={() =>
                            navigate(`${ROUTES.INVOICES}/${entry._id}`, {
                              state: { from: location.pathname, label: "Customers" },
                            })
                          }
                        >
                          {entry.invoice_number}
                        </td>
                        <td className="py-2.5 px-3 text-gray-800 dark:text-slate-200 truncate max-w-[220px]">
                          {entry.items_summary}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                          ₹{entry.debit.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          ₹{entry.credit.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          ₹{entry.invoice_balance.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/30 whitespace-nowrap">
                          ₹{entry.running_balance.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            entry.payment_status === "PAID"
                              ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                              : entry.payment_status === "PARTIAL"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200"
                              : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                          }`}>
                            {entry.payment_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() =>
                              navigate(`${ROUTES.INVOICES}/${entry._id}`, {
                                state: { from: location.pathname, label: "Customers" },
                              })
                            }
                            className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
                            title="View Invoice"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerView;
