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
  Building2,
  Send,
  Wallet,
  Receipt,
  RotateCcw,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  PlusCircle,
  Eye,
  Check,
  Smartphone,
  ExternalLink,
  Plus,
  Bell,
} from "lucide-react";
import {
  useGetCustomerByIdQuery,
  useGetCustomerLedgerQuery,
  useGetCustomerPaymentsQuery,
  useDeleteCustomerMutation,
  useRecordCustomerPaymentMutation,
  useReversePaymentMutation,
  useSendCustomerPaymentReminderMutation,
} from "../../features/customers/customerApi.js";
import { useGetCurrentUserQuery } from "../../features/auth/authApi.js";
import Button from "../../components/ui/Button.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import Alert from "../../components/ui/Alert.jsx";
import {
  Modal as Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "../../components/ui/index.js";
import { useDeleteGuard } from "../../context/DeleteGuardContext.jsx";
import { ROUTES } from "../../utils/constants.js";
import { formatDate } from "../../utils/date.js";
import CustomerPaymentModal from "../../components/customer/CustomerPaymentModal.jsx";

const CustomerView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { confirmDelete } = useDeleteGuard();

  // Fetch current user & shop from auth state
  const { data: authData } = useGetCurrentUserQuery();

  // Active Tab State (activity | invoices | payments | advances | statement)
  const [activeTab, setActiveTab] = useState("activity");

  // Ledger Filter States
  const [ledgerStartDate, setLedgerStartDate] = useState("");
  const [ledgerEndDate, setLedgerEndDate] = useState("");
  const [ledgerStatus, setLedgerStatus] = useState("ALL");

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalMode, setPaymentModalMode] = useState("AUTO_FIFO");

  // Reversal Modal State
  const [receiptToReverse, setReceiptToReverse] = useState(null);
  const [reversalReason, setReversalReason] = useState("");

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
    refetch: refetchCustomer,
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

  const {
    data: paymentsResp,
    isLoading: paymentsLoading,
    refetch: refetchPayments,
  } = useGetCustomerPaymentsQuery({ id }, { skip: !id });

  const [deleteCustomer] = useDeleteCustomerMutation();
  const [recordCustomerPayment, { isLoading: isRecordingPayment }] =
    useRecordCustomerPaymentMutation();
  const [reversePayment, { isLoading: isReversingPayment }] =
    useReversePaymentMutation();
  const [sendReminderMutation, { isLoading: isSendingReminder }] =
    useSendCustomerPaymentReminderMutation();

  const customer = customerResp?.customer;
  const invoices = customerResp?.invoices || [];

  const ledgerSummary = ledgerResp?.summary || {
    total_invoiced: 0,
    total_paid: 0,
    total_due: 0,
    store_credit_balance: 0,
    total_invoices: 0,
    paid_count: 0,
    partial_count: 0,
    unpaid_count: 0,
    last_payment: null,
  };

  const ledgerEntries = ledgerResp?.ledger_entries || [];
  const receipts = paymentsResp?.receipts || [];

  // Filter advance history from customer
  const advanceHistory = customer?.advance_history || [];

  // Handle Recording Payment
  const handleRecordPayment = async (paymentPayload) => {
    try {
      const res = await recordCustomerPayment({
        id,
        ...paymentPayload,
      }).unwrap();

      dispatch(
        showToast({
          message:
            res.message ||
            `Recorded ₹${Number(paymentPayload.amount).toLocaleString("en-IN")} payment successfully`,
          type: "success",
        })
      );
      setIsPaymentModalOpen(false);
      refetchLedger();
      refetchCustomer();
      refetchPayments();
    } catch (err) {
      console.error("Payment recording error:", err);
      dispatch(
        showToast({
          message:
            err?.data?.message || err?.message || "Failed to record payment",
          type: "error",
        })
      );
    }
  };

  // Handle Reversing a Payment Receipt
  const handleConfirmReversal = async () => {
    if (!receiptToReverse) return;
    try {
      const res = await reversePayment({
        receiptId: receiptToReverse._id,
        reason: reversalReason || "User requested cancellation",
      }).unwrap();

      dispatch(
        showToast({
          message: res.message || "Payment reversed successfully",
          type: "success",
        })
      );
      setReceiptToReverse(null);
      setReversalReason("");
      refetchLedger();
      refetchCustomer();
      refetchPayments();
    } catch (err) {
      console.error("Payment reversal error:", err);
      dispatch(
        showToast({
          message:
            err?.data?.message || err?.message || "Failed to reverse payment",
          type: "error",
        })
      );
    }
  };

  // Handle Deleting Customer
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
            showToast({ message: "Failed to delete customer", type: "error" })
          );
        }
      },
    });
  };

  // WhatsApp Statement Sharing
  const handleShareWhatsAppStatement = () => {
    if (!customer) return;
    const phone = customer.whatsapp_number?.replace(/[^\d]/g, "");
    if (!phone) {
      dispatch(
        showToast({ message: "WhatsApp number not available", type: "error" })
      );
      return;
    }

    const dueVal = ledgerSummary.total_due || 0;
    const isCredit = dueVal < 0 || (ledgerSummary.store_credit_balance || 0) > 0;
    const absDueStr = Math.abs(ledgerSummary.store_credit_balance || dueVal).toLocaleString("en-IN");
    const dueStr = dueVal.toLocaleString("en-IN");
    const paidStr = (ledgerSummary.total_paid || 0).toLocaleString("en-IN");
    const totalStr = (ledgerSummary.total_invoiced || 0).toLocaleString("en-IN");
    const shopName =
      authData?.shop?.shop_name_hi ||
      authData?.shop?.shop_name ||
      authData?.user?.shop_name ||
      "";

    let msg = `*खाता विवरण (Account Statement)*\n`;
    msg += `-----------------------------------\n`;
    msg += `*ग्राहक:* ${customer.full_name}\n`;
    msg += `*फोन:* ${customer.whatsapp_number}\n`;
    if (customer.gst_number) {
      msg += `*GSTIN:* ${customer.gst_number}\n`;
    }
    msg += `-----------------------------------\n`;
    msg += `*वित्तीय सारांश (Financial Summary)*\n`;
    msg += `• कुल बिल (Total Invoiced): ₹${totalStr}\n`;
    msg += `• कुल प्राप्त (Total Settled): ₹${paidStr}\n`;
    if (isCredit) {
      msg += `• *अग्रिम / क्रेडिट संतुलन: ₹${absDueStr} (क्रेडिट)*\n`;
    } else {
      msg += `• *बकाया राशि (Outstanding Due): ₹${dueStr}*\n`;
    }
    msg += `-----------------------------------\n`;
    msg += `*हाल की गतिविधियां (Recent Activity)*\n`;

    const recent = (ledgerEntries || []).slice(-5).reverse();
    if (recent.length === 0) {
      msg += `(कोई हालिया लेन-देन नहीं मिला)\n`;
    } else {
      recent.forEach((item) => {
        const itemDate = formatDate(item.date || item.invoice_date);
        const refNo = item.reference_number || item.invoice_number || "-";
        const desc = item.description || item.items_summary || "";
        const amt = item.credit > 0 ? `+₹${item.credit} (जमा)` : `-₹${item.debit} (बिल)`;
        msg += `• ${itemDate} [${refNo}] ${desc} : ${amt}\n`;
      });
    }

    msg += `-----------------------------------\n`;
    if (dueVal > 0) {
      msg += `*सूचना:* कृपया *₹${dueStr}* की बकाया राशि जल्द से जल्द जमा करने का कष्ट करें।\n\n`;
    } else if (isCredit) {
      msg += `*सूचना:* आपके पास *₹${absDueStr}* का स्टोर क्रेडिट उपलब्ध है।\n\n`;
    }

    if (shopName) {
      msg += `${shopName} के साथ व्यापार करने के लिए धन्यवाद! 🙏`;
    } else {
      msg += `हमारे साथ व्यापार करने के लिए धन्यवाद! 🙏`;
    }

    let formattedPhone = phone;
    if (phone.length === 10) {
      formattedPhone = `91${phone}`;
    }

    window.open(
      `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  const handlePrintStatement = () => {
    window.print();
  };

  const handleSendPaymentReminder = async () => {
    if (!customer) return;
    try {
      const res = await sendReminderMutation({ id: customer._id }).unwrap();
      dispatch(
        showToast({
          message: res?.message || "Payment reminder sent via WhatsApp",
          type: "success",
        })
      );
      refetchLedger();
    } catch (err) {
      console.error("sendReminder error:", err);
      dispatch(
        showToast({
          message:
            err?.data?.message || err?.message || "Failed to send payment reminder",
          type: "error",
        })
      );
    }
  };

  const clearLedgerFilters = () => {
    setLedgerStartDate("");
    setLedgerEndDate("");
    setLedgerStatus("ALL");
  };

  if (customerLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 text-center">
        <User className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
          Customer not found
        </h3>
        <p className="text-sm text-ink-secondary dark:text-slate-400 mb-6">
          {error?.data?.message || "The customer you are looking for does not exist or has been deleted."}
        </p>
        <Button onClick={() => navigate(from)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Customers
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

  // Calculate Overdue Amount from invoices
  const today = new Date();
  const overdueAmount = invoices
    .filter((inv) => {
      if (inv.payment_status === "PAID") return false;
      if (!inv.due_date) return false;
      return new Date(inv.due_date) < today;
    })
    .reduce((sum, inv) => {
      const tot = Number(inv.total_amount || 0);
      const pd = Number(inv.amount_paid || 0);
      const cr = Number(inv.excess_exchange_credit || 0);
      return sum + Math.max(0, tot - (pd + cr));
    }, 0);

  const advanceBalance = Number(customer?.advance_balance || 0);
  const lastPayment = ledgerSummary?.last_payment;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-3 sm:p-6 transition-colors print:bg-white print:p-0">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* ── TOP NAVIGATION & ACTIONS HEADER BAR (Matching InvoiceView) ── */}
        <div className="bg-white dark:bg-dark-card p-3.5 sm:p-4 rounded-xl shadow-xs border border-gray-200 dark:border-dark-border space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
            <button
              onClick={() => navigate(from)}
              className="inline-flex items-center self-start px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <ArrowLeft size={14} className="mr-1.5" />
              Back to {label}
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">
                {customer.full_name}
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Customer Account #{customer._id?.slice(-6) || customer._id} · Registered on {formatDate(customer.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0 border-t border-gray-100 dark:border-gray-800 sm:border-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintStatement}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs py-2 sm:py-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" /> Print Statement
            </Button>
            {customer?.whatsapp_number && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsAppStatement}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs py-2 sm:py-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" /> Share Statement
              </Button>
            )}
            {customer?.whatsapp_number && (ledgerSummary.total_due > 0 || overdueAmount > 0) && canEdit("customers") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendPaymentReminder}
                disabled={isSendingReminder}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs py-2 sm:py-1.5 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800"
              >
                <Bell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {isSendingReminder ? "Sending..." : "Send Reminder"}
              </Button>
            )}
            {canEdit("customers") && (
              <Button
                size="sm"
                onClick={() => {
                  setPaymentModalMode("AUTO_FIFO");
                  setIsPaymentModalOpen(true);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs py-2 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Coins className="w-3.5 h-3.5 text-blue-200" /> Receive Payment
              </Button>
            )}
          </div>
        </div>

        {/* ── MAIN CONTENT LAYOUT GRID (2-Col Left + 1-Col Right Matching InvoiceView) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* ── LEFT COLUMN (2 Cols) ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* 1. Customer Hero Gradient Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 sm:p-5 text-white shadow-sm border border-blue-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 text-white font-bold text-base sm:text-lg shadow-2xs">
                    {customer.full_name?.charAt(0)?.toUpperCase() || <User className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold truncate">
                        {customer.full_name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                        {customer.customer_type || "RETAIL"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-blue-100 mt-0.5 flex-wrap">
                      {customer.whatsapp_number && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span className="font-mono">{customer.whatsapp_number}</span>
                        </p>
                      )}
                      {customer.gst_number && (
                        <p className="flex items-center gap-1.5 font-mono">
                          <span>GSTIN: {customer.gst_number}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t border-blue-500/40 sm:border-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      ledgerSummary.total_due > 0
                        ? "bg-amber-100 text-amber-900"
                        : (ledgerSummary.total_due < 0 || advanceBalance > 0 || (ledgerSummary.store_credit_balance || 0) > 0)
                        ? "bg-indigo-100 text-indigo-900"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {ledgerSummary.total_due > 0
                      ? "OUTSTANDING"
                      : (ledgerSummary.total_due < 0 || advanceBalance > 0 || (ledgerSummary.store_credit_balance || 0) > 0)
                      ? "CREDIT BAL"
                      : "SETTLED"}
                  </span>
                  <div className="text-right">
                    <span className="text-[11px] text-blue-100 block font-medium">
                      {ledgerSummary.total_due > 0 ? "Total Due" : "Net Balance"}
                    </span>
                    <strong className="text-base sm:text-xl font-bold">
                      ₹{Math.abs(ledgerSummary.total_due || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Customer Profile Details Bento Grid (Matching InvoiceView detail cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Contact & Identity Card */}
              <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs space-y-2">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider text-gray-500 flex items-center justify-between">
                  <span>Contact & Identity</span>
                  <span className="text-[10px] font-mono text-gray-400">ID #{customer._id?.slice(-6)}</span>
                </h3>
                <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                  {customer.whatsapp_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> Primary Phone
                      </span>
                      <a
                        href={`https://wa.me/${customer.whatsapp_number.replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {customer.whatsapp_number}
                      </a>
                    </div>
                  )}
                  {customer.alternate_phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> Alternate Phone
                      </span>
                      <span className="font-mono">{customer.alternate_phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" /> Email Address
                      </span>
                      <span className="truncate max-w-[170px]" title={customer.email}>{customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500">
                    <span>Language: <strong className="text-gray-700 dark:text-gray-300">{customer.preferred_language || "ENGLISH"}</strong></span>
                    <span>Registered: {formatDate(customer.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Address & Business Card */}
              <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs space-y-2">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider text-gray-500 flex items-center justify-between">
                  <span>Address & Business</span>
                  {customer.gst_number && (
                    <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">GSTIN VERIFIED</span>
                  )}
                </h3>
                <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-slate-300 line-clamp-2">{fullAddress}</span>
                  </div>
                  {customer.gst_number && (
                    <div className="bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">GST Number</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white">{customer.gst_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-800">
                    {customer.date_of_birth && (
                      <span>🎂 DOB: {formatDate(customer.date_of_birth)}</span>
                    )}
                    {customer.anniversary_date && (
                      <span>💍 Anniv: {formatDate(customer.anniversary_date)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Customer Notes Banner (if present) */}
            {customer.notes && (
              <div className="px-3.5 py-2.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Customer Notes: </span>
                  <span>{customer.notes}</span>
                </div>
              </div>
            )}

            {/* 4. Financial KPI Row (4 Compact Metrics matching InvoiceView meta cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Total Outstanding */}
              <div className={`p-3 rounded-xl border shadow-xs flex flex-col justify-between ${
                ledgerSummary.total_due > 0
                  ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80"
                  : "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">Total Outstanding</span>
                  <AlertTriangle className={`w-3.5 h-3.5 ${ledgerSummary.total_due > 0 ? "text-amber-600" : "text-gray-400"}`} />
                </div>
                <div className="mt-1">
                  <span className={`text-base sm:text-lg font-black ${
                    ledgerSummary.total_due > 0 ? "text-amber-700 dark:text-amber-300" : "text-gray-900 dark:text-white"
                  }`}>
                    ₹{Number(ledgerSummary.total_due || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    {ledgerSummary.total_due > 0 ? "Unpaid bill dues" : "Zero pending dues"}
                  </span>
                </div>
              </div>

              {/* Overdue Amount */}
              <div className={`p-3 rounded-xl border shadow-xs flex flex-col justify-between ${
                overdueAmount > 0
                  ? "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800/80"
                  : "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">Overdue Dues</span>
                  <Clock className={`w-3.5 h-3.5 ${overdueAmount > 0 ? "text-red-600" : "text-gray-400"}`} />
                </div>
                <div className="mt-1">
                  <span className={`text-base sm:text-lg font-black ${
                    overdueAmount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                  }`}>
                    ₹{overdueAmount.toLocaleString("en-IN")}
                  </span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    {overdueAmount > 0 ? "Past due date" : "No overdue bills"}
                  </span>
                </div>
              </div>

              {/* Available Advance Credit */}
              <div className="bg-white dark:bg-dark-card p-3 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">Advance Credit</span>
                  <Wallet className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="mt-1">
                  <span className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-300">
                    ₹{advanceBalance.toLocaleString("en-IN")}
                  </span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    Store credit wallet
                  </span>
                </div>
              </div>

              {/* Last Payment */}
              <div className="bg-white dark:bg-dark-card p-3 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">Last Payment</span>
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="mt-1">
                  <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {lastPayment?.amount ? `₹${Number(lastPayment.amount).toLocaleString("en-IN")}` : "₹0"}
                  </span>
                  <span className="block text-[10px] text-gray-400 mt-0.5 truncate">
                    {lastPayment?.date ? `${formatDate(lastPayment.date)} · ${lastPayment.method || "CASH"}` : "No payment recorded"}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Customer Transactions Tabs Container (Matching InvoiceView Line Items container) */}
            <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-xs overflow-hidden">
              {/* Tabs Navigation Bar */}
              <div className="flex border-b border-gray-200 dark:border-dark-border overflow-x-auto bg-gray-50/50 dark:bg-dark-subtle/30 px-2 pt-2 gap-1 text-xs print:hidden">
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`py-2 px-3.5 rounded-t-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "activity"
                      ? "bg-white dark:bg-dark-card text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-600 border-x border-gray-200 dark:border-dark-border shadow-xs"
                      : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> All Activity ({ledgerEntries.length})
                </button>

                <button
                  onClick={() => setActiveTab("invoices")}
                  className={`py-2 px-3.5 rounded-t-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "invoices"
                      ? "bg-white dark:bg-dark-card text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-600 border-x border-gray-200 dark:border-dark-border shadow-xs"
                      : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Invoices ({invoices.length})
                </button>

                <button
                  onClick={() => setActiveTab("payments")}
                  className={`py-2 px-3.5 rounded-t-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "payments"
                      ? "bg-white dark:bg-dark-card text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-600 border-x border-gray-200 dark:border-dark-border shadow-xs"
                      : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" /> Payments ({receipts.length})
                </button>

                <button
                  onClick={() => setActiveTab("advances")}
                  className={`py-2 px-3.5 rounded-t-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "advances"
                      ? "bg-white dark:bg-dark-card text-purple-600 dark:text-purple-400 border-t-2 border-t-purple-600 border-x border-gray-200 dark:border-dark-border shadow-xs"
                      : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" /> Advances ({advanceHistory.length})
                </button>

                <button
                  onClick={() => setActiveTab("statement")}
                  className={`py-2 px-3.5 rounded-t-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "statement"
                      ? "bg-white dark:bg-dark-card text-emerald-600 dark:text-emerald-400 border-t-2 border-t-emerald-600 border-x border-gray-200 dark:border-dark-border shadow-xs"
                      : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Account Statement
                </button>
              </div>

              {/* Filter Toolbar for Ledger & Activity */}
              {(activeTab === "activity" || activeTab === "statement") && (
                <div className="p-3 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-subtle/20 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-blue-500" /> Filter Date:
                    </span>
                    <input
                      type="date"
                      value={ledgerStartDate}
                      onChange={(e) => setLedgerStartDate(e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-200 dark:border-dark-border rounded-md bg-white dark:bg-dark-input text-gray-800 dark:text-slate-200"
                      title="Start Date"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="date"
                      value={ledgerEndDate}
                      onChange={(e) => setLedgerEndDate(e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-200 dark:border-dark-border rounded-md bg-white dark:bg-dark-input text-gray-800 dark:text-slate-200"
                      title="End Date"
                    />

                    {(ledgerStartDate || ledgerEndDate) && (
                      <button
                        onClick={clearLedgerFilters}
                        className="inline-flex items-center gap-1 px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors font-medium text-[11px]"
                      >
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-gray-500">
                    Showing <strong>{ledgerEntries.length}</strong> transaction entries
                  </div>
                </div>
              )}

              {/* TAB 1: ALL ACTIVITY TIMELINE */}
              {activeTab === "activity" && (
                <div className="p-3 sm:p-4">
                  {ledgerLoading ? (
                    <div className="py-8 flex justify-center">
                      <LoadingSpinner />
                    </div>
                  ) : !ledgerEntries.length ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      <TrendingUp className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                      No account transactions found for this customer.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {ledgerEntries.map((ev, idx) => {
                        const isCredit = ev.credit > 0;
                        const isReversal = ev.event_type === "PAYMENT_REVERSED";
                        const isAdvance = ev.is_advance;

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                              isReversal
                                ? "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/60"
                                : isAdvance
                                ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60"
                                : isCredit
                                ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60"
                                : "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                  isReversal
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/50"
                                    : isAdvance
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50"
                                    : isCredit
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/50"
                                }`}
                              >
                                {isReversal ? (
                                  <RotateCcw className="w-4 h-4" />
                                ) : isAdvance ? (
                                  <Wallet className="w-4 h-4" />
                                ) : isCredit ? (
                                  <ArrowDownLeft className="w-4 h-4" />
                                ) : (
                                  <ArrowUpRight className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {ev.description || ev.items_summary || "Financial Transaction"}
                                  </span>
                                  {ev.reference_number && (
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-input text-gray-700 dark:text-slate-300">
                                      {ev.reference_number}
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isReversal
                                        ? "bg-red-100 text-red-800"
                                        : isCredit
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {ev.event_type || (isCredit ? "PAYMENT" : "INVOICE")}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                  {formatDate(ev.date || ev.invoice_date)}
                                  {ev.payment_method && ` · Mode: ${ev.payment_method}`}
                                  {ev.collected_by && ` · By: ${ev.collected_by}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100 dark:border-gray-800">
                              <div className="text-right">
                                <span
                                  className={`text-sm font-black ${
                                    isReversal
                                      ? "text-red-600 dark:text-red-400"
                                      : isCredit
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-gray-900 dark:text-white"
                                  }`}
                                >
                                  {isCredit ? `+₹${ev.credit}` : `₹${ev.debit}`}
                                </span>
                                <span className="block text-[10px] text-gray-400">
                                  Bal: ₹{Number(ev.running_balance || 0).toLocaleString("en-IN")}
                                </span>
                              </div>

                              {ev.invoice_id && (
                                <button
                                  onClick={() =>
                                    navigate(`${ROUTES.INVOICES}/${ev.invoice_id}`, {
                                      state: { from: location.pathname, label: "Customers" },
                                    })
                                  }
                                  className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                                  title="View Linked Invoice"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INVOICES TABLE */}
              {activeTab === "invoices" && (
                <div>
                  {!invoices.length ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      <FileText className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                      No invoices found for this customer.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 dark:bg-dark-subtle/50 text-gray-600 dark:text-slate-400 uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Invoice #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-right">Total Amount</th>
                            <th className="py-2.5 px-3 text-right">Settled</th>
                            <th className="py-2.5 px-3 text-right">Remaining Due</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                          {invoices.map((inv) => {
                            const total = Number(inv.total_amount || 0);
                            const paid = Number(inv.amount_paid || 0);
                            const exch = Number(inv.excess_exchange_credit || 0);
                            const due = Math.max(0, total - (paid + exch));
                            const isPaid = inv.payment_status === "PAID" || due === 0;

                            return (
                              <tr key={inv._id} className="hover:bg-gray-50/50">
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                                  <button
                                    onClick={() =>
                                      navigate(`${ROUTES.INVOICES}/${inv._id}`, {
                                        state: { from: location.pathname, label: "Customers" },
                                      })
                                    }
                                    className="hover:underline"
                                  >
                                    {inv.invoice_number}
                                  </button>
                                </td>
                                <td className="py-2.5 px-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                                  {formatDate(inv.invoice_date)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-white">
                                  ₹{total.toLocaleString("en-IN")}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                                  ₹{paid.toLocaleString("en-IN")}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-red-600">
                                  ₹{due.toLocaleString("en-IN")}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isPaid
                                        ? "bg-emerald-100 text-emerald-800"
                                        : paid > 0
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {isPaid ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {!isPaid && canEdit("invoices") && (
                                      <button
                                        onClick={() => {
                                          setPaymentModalMode("MANUAL");
                                          setIsPaymentModalOpen(true);
                                        }}
                                        className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold border border-emerald-200"
                                      >
                                        Pay
                                      </button>
                                    )}
                                    <button
                                      onClick={() =>
                                        navigate(`${ROUTES.INVOICES}/${inv._id}`, {
                                          state: { from: location.pathname, label: "Customers" },
                                        })
                                      }
                                      className="p-1 text-gray-500 hover:text-blue-600"
                                      title="View Invoice"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PAYMENTS & RECEIPTS TABLE */}
              {activeTab === "payments" && (
                <div>
                  {paymentsLoading ? (
                    <div className="py-8 flex justify-center">
                      <LoadingSpinner />
                    </div>
                  ) : !receipts.length ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      <Receipt className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                      No payment receipts recorded yet for this customer.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 dark:bg-dark-subtle/50 text-gray-600 dark:text-slate-400 uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Receipt #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-right">Amount Received</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3">Reference / UTR</th>
                            <th className="py-2.5 px-3">Allocations</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                          {receipts.map((rec) => {
                            const isReversed = rec.status === "REVERSED";

                            return (
                              <tr
                                key={rec._id}
                                className={`hover:bg-gray-50/50 ${
                                  isReversed ? "opacity-60 bg-red-50/20" : ""
                                }`}
                              >
                                <td className="py-2.5 px-3 font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                  {rec.receipt_number}
                                </td>
                                <td className="py-2.5 px-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                                  {formatDate(rec.payment_date)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-emerald-600 whitespace-nowrap">
                                  ₹{Number(rec.amount).toLocaleString("en-IN")}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-dark-subtle text-gray-800 dark:text-slate-200">
                                    {rec.payment_method}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-gray-500 whitespace-nowrap">
                                  {rec.transaction_reference || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-gray-600 dark:text-slate-300">
                                  <div className="space-y-0.5">
                                    {rec.allocations && rec.allocations.length > 0 ? (
                                      rec.allocations.map((al, aIdx) => (
                                        <div key={aIdx} className="text-[11px] flex items-center gap-1.5">
                                          <span className="font-mono text-blue-600">{al.invoice_number}:</span>
                                          <span>₹{al.amount}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-[11px] text-gray-400 italic">No bill allocations</span>
                                    )}
                                    {rec.advance_amount_credited > 0 && (
                                      <div className="text-[11px] text-purple-600 font-semibold">
                                        +₹{rec.advance_amount_credited} credited to advance
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isReversed
                                        ? "bg-red-100 text-red-800"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                  >
                                    {rec.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  {!isReversed && canEdit("customers") && (
                                    <button
                                      onClick={() => setReceiptToReverse(rec)}
                                      className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[10px] font-bold border border-red-200 flex items-center gap-1 ml-auto"
                                    >
                                      <RotateCcw className="w-3 h-3" /> Reverse
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ADVANCE WALLET HISTORY */}
              {activeTab === "advances" && (
                <div className="p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-purple-600" />
                      <div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white block">
                          Current Advance Wallet Balance
                        </span>
                        <span className="text-[11px] text-gray-500">
                          Store credit usable for future purchases or invoice balance settlement
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-purple-700 dark:text-purple-300">
                        ₹{advanceBalance.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {!advanceHistory.length ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      <Wallet className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                      No advance wallet credits or utilizations recorded.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 dark:bg-dark-subtle/50 text-gray-600 dark:text-slate-400 uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Transaction</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 px-3">Method</th>
                            <th className="py-2.5 px-3">Reference / Notes</th>
                            <th className="py-2.5 px-3">Invoice Applied</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                          {advanceHistory.map((adv, aIdx) => {
                            const isDeposit = adv.amount > 0;

                            return (
                              <tr key={aIdx} className="hover:bg-gray-50/50">
                                <td className="py-2.5 px-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                                  {formatDate(adv.payment_date || adv.createdAt)}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isDeposit
                                        ? "bg-purple-100 text-purple-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {isDeposit ? "ADVANCE DEPOSIT" : "UTILIZATION"}
                                  </span>
                                </td>
                                <td
                                  className={`py-2.5 px-3 text-right font-black whitespace-nowrap ${
                                    isDeposit ? "text-purple-600" : "text-gray-900 dark:text-white"
                                  }`}
                                >
                                  {isDeposit ? `+₹${adv.amount}` : `-₹${Math.abs(adv.amount)}`}
                                </td>
                                <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                                  {adv.payment_method || "CASH"}
                                </td>
                                <td className="py-2.5 px-3 text-gray-600 dark:text-slate-300">
                                  {adv.notes || adv.transaction_reference || "—"}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-blue-600 whitespace-nowrap">
                                  {adv.invoice_number || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: FORMAL ACCOUNT STATEMENT (Printable) */}
              {activeTab === "statement" && (
                <div className="p-3 sm:p-4 space-y-4">
                  <div className="border rounded-xl p-4 bg-white dark:bg-dark-card space-y-4">
                    {/* Header in Statement */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 dark:border-dark-border gap-2">
                      <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                          Customer Account Statement
                        </h2>
                        <p className="text-xs text-gray-500">
                          Customer: <strong>{customer.full_name}</strong> · Phone: {customer.whatsapp_number}
                        </p>
                      </div>
                      <div className="text-left sm:text-right text-xs">
                        <p className="text-gray-500">
                          Period:{" "}
                          <strong>
                            {ledgerStartDate ? formatDate(ledgerStartDate) : "Beginning"}{" "}
                            to{" "}
                            {ledgerEndDate ? formatDate(ledgerEndDate) : "Today"}
                          </strong>
                        </p>
                        <p className="font-bold text-gray-800 dark:text-slate-200">
                          Generated on {formatDate(new Date())}
                        </p>
                      </div>
                    </div>

                    {/* Statement Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse border">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-dark-input text-gray-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                            <th className="p-2 border">Date</th>
                            <th className="p-2 border">Ref / Doc #</th>
                            <th className="p-2 border">Description</th>
                            <th className="p-2 border text-right">Debit (₹)</th>
                            <th className="p-2 border text-right">Credit (₹)</th>
                            <th className="p-2 border text-right">Running Balance (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Opening Balance Row */}
                          <tr className="bg-gray-50 dark:bg-dark-subtle/40 font-semibold text-gray-700 dark:text-slate-300">
                            <td className="p-2 border whitespace-nowrap">
                              {ledgerStartDate ? formatDate(ledgerStartDate) : "—"}
                            </td>
                            <td className="p-2 border font-mono">OPENING</td>
                            <td className="p-2 border italic">
                              Opening Balance forward
                            </td>
                            <td className="p-2 border text-right">—</td>
                            <td className="p-2 border text-right">—</td>
                            <td className="p-2 border text-right font-bold">
                              ₹{Number(ledgerResp?.opening_balance || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>

                          {/* Entries */}
                          {ledgerEntries.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="p-2 border whitespace-nowrap">
                                {formatDate(row.date || row.invoice_date)}
                              </td>
                              <td className="p-2 border font-mono font-bold whitespace-nowrap">
                                {row.reference_number || row.invoice_number}
                              </td>
                              <td className="p-2 border text-gray-800 dark:text-slate-200">
                                {row.description || row.items_summary || "Invoice obligation"}
                              </td>
                              <td className="p-2 border text-right font-bold">
                                {row.debit > 0 ? `₹${Number(row.debit).toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="p-2 border text-right font-bold text-emerald-600">
                                {row.credit > 0 ? `₹${Number(row.credit).toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="p-2 border text-right font-black bg-blue-50/30">
                                ₹{Number(row.running_balance || 0).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}

                          {/* Closing Balance Row */}
                          <tr className="bg-gray-100 dark:bg-dark-input font-bold text-gray-900 dark:text-white border-t-2">
                            <td className="p-2 border" colSpan={3}>
                              Closing Account Balance
                            </td>
                            <td className="p-2 border text-right text-gray-900">
                              ₹{ledgerEntries.reduce((s, r) => s + (Number(r.debit) || 0), 0).toLocaleString("en-IN")}
                            </td>
                            <td className="p-2 border text-right text-emerald-600">
                              ₹{ledgerEntries.reduce((s, r) => s + (Number(r.credit) || 0), 0).toLocaleString("en-IN")}
                            </td>
                            <td className="p-2 border text-right text-base font-black text-blue-700 dark:text-blue-300">
                              ₹{Number(ledgerResp?.closing_balance ?? ledgerSummary?.total_due ?? 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 print:hidden">
                      <Button variant="outline" size="sm" onClick={handlePrintStatement} className="flex items-center gap-1.5">
                        <Printer className="w-3.5 h-3.5" /> Print Statement
                      </Button>
                      <Button variant="primary" size="sm" onClick={handleShareWhatsAppStatement} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                        <Share2 className="w-3.5 h-3.5" /> WhatsApp Statement
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN (1 Col) - Actions & Summary Sidebar (Matching InvoiceView) ── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick Actions Panel */}
            <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border shadow-xs sticky top-4 space-y-3 print:hidden">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center justify-between">
                <span>Customer Management</span>
                <span className="text-[10px] font-semibold text-gray-400">Quick Actions</span>
              </h3>

              <div className="space-y-2">
                {/* 1. Receive Payment Button */}
                {canEdit("customers") && (
                  <button
                    onClick={() => {
                      setPaymentModalMode("AUTO_FIFO");
                      setIsPaymentModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                  >
                    <span className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-blue-200" /> Receive Payment
                    </span>
                    {ledgerSummary.total_due > 0 && (
                      <span className="bg-blue-700 px-2 py-0.5 rounded text-[11px]">
                        Due: ₹{ledgerSummary.total_due.toLocaleString("en-IN")}
                      </span>
                    )}
                  </button>
                )}

                {/* 2. Add Advance Wallet Deposit */}
                {canEdit("customers") && (
                  <button
                    onClick={() => {
                      setPaymentModalMode("ADVANCE_ONLY");
                      setIsPaymentModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-purple-600" /> Add Advance Deposit
                    </span>
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-purple-400" />
                  </button>
                )}

                {/* 3. Create Invoice */}
                {canCreate("invoices") && (
                  <button
                    onClick={() => navigate(`${ROUTES.NEW_INVOICE}?customer_id=${id}`)}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" /> Create New Invoice
                    </span>
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-emerald-400" />
                  </button>
                )}

                {/* 4. Share Statement on WhatsApp */}
                {customer?.whatsapp_number && (
                  <button
                    onClick={handleShareWhatsAppStatement}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-green-600" /> Share on WhatsApp
                    </span>
                    <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                  </button>
                )}

                {/* 5. Print Account Statement */}
                <button
                  onClick={handlePrintStatement}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-gray-600 dark:text-gray-300" /> Print Formal Statement
                  </span>
                </button>

                {/* 6. Edit Customer Details */}
                {canEdit("customers") && (
                  <button
                    onClick={() => navigate(`${ROUTES.CUSTOMERS}/${id}/edit`)}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-600" /> Edit Customer Profile
                    </span>
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-gray-400" />
                  </button>
                )}

                {/* 7. Delete Customer */}
                {canDelete("customers") && (
                  <button
                    onClick={handleDeleteCustomer}
                    className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-600" /> Delete Customer
                    </span>
                  </button>
                )}
              </div>

              {/* Financial Snapshot Summary Card in Sidebar */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider text-gray-500">
                  Account Position Breakdown
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Total Invoiced</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₹{Number(ledgerSummary.total_invoiced || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Total Settled (Paid)</span>
                    <span>₹{Number(ledgerSummary.total_paid || 0).toLocaleString("en-IN")}</span>
                  </div>
                  {advanceBalance > 0 && (
                    <div className="flex justify-between text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-950/40 p-1.5 rounded-lg border border-purple-200 dark:border-purple-800">
                      <span>Available Advance</span>
                      <span>₹{advanceBalance.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-gray-200 dark:border-gray-700 pt-2 text-gray-900 dark:text-white">
                    <span>Net Outstanding Due</span>
                    <span className={ledgerSummary.total_due > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}>
                      ₹{Number(ledgerSummary.total_due || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                    <span>Invoices: {ledgerSummary.total_invoices || 0}</span>
                    <span className="text-emerald-600 font-semibold">{ledgerSummary.paid_count || 0} Paid</span>
                    <span className="text-amber-600 font-semibold">{ledgerSummary.partial_count || 0} Partial</span>
                    <span className="text-red-600 font-semibold">{ledgerSummary.unpaid_count || 0} Unpaid</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RECORD PAYMENT MODAL ── */}
      <CustomerPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        customer={customer}
        ledgerSummary={ledgerSummary}
        invoices={invoices}
        ledgerEntries={ledgerEntries}
        onRecordPayment={handleRecordPayment}
        isLoading={isRecordingPayment}
        initialMode={paymentModalMode}
      />

      {/* ── PAYMENT REVERSAL CONFIRMATION DIALOG ── */}
      {receiptToReverse && (
        <Dialog
          open={Boolean(receiptToReverse)}
          onClose={() => setReceiptToReverse(null)}
          maxWidth="md"
        >
          <DialogHeader onClose={() => setReceiptToReverse(null)}>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-red-600" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Reverse Payment Receipt
              </h3>
            </div>
          </DialogHeader>
          <DialogBody className="space-y-3 p-4">
            <p className="text-xs text-gray-600 dark:text-slate-300">
              Are you sure you want to reverse Receipt{" "}
              <strong>{receiptToReverse.receipt_number}</strong> for{" "}
              <strong className="text-emerald-600">
                ₹{Number(receiptToReverse.amount).toLocaleString("en-IN")}
              </strong>
              ?
            </p>
            <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg border border-red-200 dark:border-red-900">
              This will restore dues on affected invoices, subtract any credited advance wallet funds, and write an immutable audit log entry.
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Reason for Reversal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Cheque bounced / Customer cancelled / Wrong amount"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-gray-900 dark:text-white focus:ring-1 focus:ring-red-500"
              />
            </div>
          </DialogBody>
          <DialogFooter className="p-3 flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptToReverse(null)}
              disabled={isReversingPayment}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmReversal}
              disabled={isReversingPayment || !reversalReason.trim()}
              className="bg-red-600 hover:bg-red-700 flex items-center gap-1.5"
            >
              {isReversingPayment ? "Reversing..." : "Confirm Reversal"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
};

export default CustomerView;