import React, { useState, useRef, useEffect } from "react";
import {
  Activity,
  MessageSquare,
  CheckCircle,
  CheckCheck,
  XCircle,
  Clock,
  Send,
  Filter,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Smartphone,
  Layers,
  Info,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  X,
  User,
  Phone,
  FileText,
} from "lucide-react";
import { Button } from "../../components/ui/index.js";
import {
  useGetReminderStatsQuery,
  useGetReminderLogsQuery,
  useGetMessageLogsQuery,
} from "../../services/baseApi.js";

function Logs() {
  // Main Tab State: "whatsapp" (default) or "reminders"
  const [activeTab, setActiveTab] = useState("whatsapp");

  // Shared Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  // Inspector Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedRequestId, setCopiedRequestId] = useState(false);

  // WhatsApp Tab State
  const [waPage, setWaPage] = useState(1);
  const [waLimit, setWaLimit] = useState(10);
  const [waFilters, setWaFilters] = useState({
    campaignName: "",
    delivery_status: "",
    start_date: "",
    end_date: "",
  });

  // Reminder Tab State
  const [remPage, setRemPage] = useState(1);
  const [remLimit, setRemLimit] = useState(10);
  const [remFilters, setRemFilters] = useState({
    entity_type: "",
    message_status: "",
    start_date: "",
    end_date: "",
  });

  // RTK Query Hooks
  // 1. WhatsApp Delivery Logs
  const {
    data: msgLogsData,
    isLoading: msgLogsLoading,
    isFetching: msgLogsFetching,
    error: msgLogsError,
    refetch: refetchMsgLogs,
  } = useGetMessageLogsQuery(
    {
      page: waPage,
      limit: waLimit,
      search: searchTerm,
      campaignName: waFilters.campaignName,
      delivery_status: waFilters.delivery_status,
      start_date: waFilters.start_date,
      end_date: waFilters.end_date,
    },
    { skip: activeTab !== "whatsapp" }
  );

  // 2. Reminder Logs
  const {
    data: reminderStatsData,
    isLoading: reminderStatsLoading,
    refetch: refetchReminderStats,
  } = useGetReminderStatsQuery(undefined, { skip: activeTab !== "reminders" });

  const {
    data: reminderLogsData,
    isLoading: reminderLogsLoading,
    error: reminderLogsError,
    refetch: refetchReminderLogs,
  } = useGetReminderLogsQuery(
    {
      page: remPage,
      limit: remLimit,
      search: searchTerm,
      ...remFilters,
    },
    { skip: activeTab !== "reminders" }
  );

  // Extract WhatsApp data
  const waLogs = msgLogsData?.data?.logs || [];
  const waPagination = msgLogsData?.data?.pagination || {};
  const waSummary = msgLogsData?.data?.summary || {
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
  };
  const availableTemplates = msgLogsData?.data?.templates || [];

  // Extract Reminder data
  const remStats = reminderStatsData?.data;
  const remLogs = reminderLogsData?.data?.logs || [];
  const remPagination = reminderLogsData?.data?.pagination || {};

  // Close filter dropdown on outside click
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

  const handleRefresh = () => {
    if (activeTab === "whatsapp") {
      refetchMsgLogs();
    } else {
      refetchReminderStats();
      refetchReminderLogs();
    }
  };

  const handleClearFilters = () => {
    if (activeTab === "whatsapp") {
      setWaFilters({
        campaignName: "",
        delivery_status: "",
        start_date: "",
        end_date: "",
      });
    } else {
      setRemFilters({
        entity_type: "",
        message_status: "",
        start_date: "",
        end_date: "",
      });
    }
    setSearchTerm("");
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === "") return "";
    const num = Number(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatTemplateName = (name) => {
    if (!name) return "General Message";
    const templatesMap = {
      invoice_generated_notification: "Invoice Generated Notification",
      invoice_created: "Invoice Created",
      payment_reminder: "Payment Reminder",
      payment_reminders: "Payment Reminders",
      payment_received: "Payment Received",
      daily_payment_summary: "Daily Payment Summary",
      daily_summary: "Daily Summary",
      service_reminder: "Service Reminder",
      birthday_wish: "Birthday Wish",
      anniversary_wish: "Anniversary Wish",
      custom_notification: "Custom Notification",
      manual_message: "Manual Message",
      warranty_expired: "Warranty Expired",
      warranty_expiry: "Warranty Expiry",
    };
    if (templatesMap[name]) return templatesMap[name];
    return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const parseLogContent = (log) => {
    const raw = log?.content || log?.meta?.content;
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const extractContentSummary = (log) => {
    const content = parseLogContent(log);
    if (!content) return null;

    const tpl = (log.campaignName || log.messageType || log.meta?.template_name || "").toLowerCase();
    const getVal = (key) => content[key]?.text || content[key]?.value || "";
    const document = content.header_1?.document || null;
    const buttonText = content.button_1?.text || "";

    if (tpl.includes("payment_reminder")) {
      return {
        type: "payment_reminder",
        customerName: getVal("body_1"),
        amountDue: getVal("body_2"),
        invoiceNumber: getVal("body_3"),
        itemOrSerial: getVal("body_4"),
        dueDate: getVal("body_5"),
        helpline: getVal("body_6"),
        storeName: getVal("body_7"),
        buttonText,
        document,
        content,
      };
    }

    if (tpl.includes("invoice_generated") || tpl.includes("invoice_created")) {
      return {
        type: "invoice_generated",
        customerName: getVal("body_1"),
        storeName: getVal("body_2"),
        invoiceNumber: getVal("body_3"),
        invoiceDate: getVal("body_4"),
        totalAmount: getVal("body_5"),
        paidAmount: getVal("body_6"),
        balanceDue: getVal("body_7"),
        paymentStatus: getVal("body_8"),
        helpline: getVal("body_9"),
        buttonText,
        document,
        content,
      };
    }

    // Generic parameter scanning
    let invoiceNumber = "";
    let amount = "";
    let date = "";
    const fields = [];

    Object.entries(content).forEach(([k, v]) => {
      const text = v?.text || (typeof v === "string" ? v : "");
      if (!text) return;
      if (k.startsWith("body_")) {
        fields.push({ key: k, text });
        if (!invoiceNumber && /INV-[\w-]+/i.test(text)) {
          invoiceNumber = text;
        } else if (!amount && /^\d+(\.\d{1,2})?$/.test(text)) {
          amount = text;
        } else if (!date && /\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(text)) {
          date = text;
        }
      }
    });

    return {
      type: "generic",
      customerName: getVal("body_1"),
      invoiceNumber,
      amount,
      date,
      fields,
      buttonText,
      document,
      content,
    };
  };

  const getWhatsappStatusBadge = (log) => {
    const deliveryStatus = (log.meta?.delivery_status || "").toLowerCase();
    const mainStatus = (log.status || "").toLowerCase();

    if (deliveryStatus === "read") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <CheckCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          Read
        </span>
      );
    }
    if (deliveryStatus === "delivered") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
          <CheckCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          Delivered
        </span>
      );
    }
    if (
      deliveryStatus === "sent" ||
      mainStatus === "success" ||
      mainStatus === "submitted"
    ) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Sent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
        <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
        Failed
      </span>
    );
  };

  const getReminderStatusBadge = (status) => {
    const badgeClasses = {
      SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
      DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
      READ: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
      FAILED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
      PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    };

    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badgeClasses[status] || badgeClasses.PENDING}`}
      >
        {status}
      </span>
    );
  };

  const getEntityTypeBadge = (entityType) => {
    const badgeClasses = {
      INVOICE: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
      PRODUCT: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
      SERVICE: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
      CUSTOMER: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    };

    return (
      <span
        className={`inline-flex px-2 py-1 text-xs rounded-full ${badgeClasses[entityType] || badgeClasses.INVOICE}`}
      >
        {entityType}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    try {
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-3 sm:py-6">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-8">
        
        {/* Header Title & Sub-tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink-base dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600" />
              Communication & Delivery Logs
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted dark:text-slate-400">
              Track real-time WhatsApp message delivery reports (DLR) across all templates & automated reminders
            </p>
          </div>

          {/* Tab Switcher Buttons */}
          <div className="flex items-center bg-gray-200 dark:bg-dark-subtle p-1 rounded-xl shadow-inner shrink-0">
            <button
              onClick={() => {
                setActiveTab("whatsapp");
                setSearchTerm("");
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                activeTab === "whatsapp"
                  ? "bg-white dark:bg-dark-card text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-500" />
              WhatsApp Message Delivery Logs
            </button>
            <button
              onClick={() => {
                setActiveTab("reminders");
                setSearchTerm("");
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                activeTab === "reminders"
                  ? "bg-white dark:bg-dark-card text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              Automated Reminder Logs
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border mb-4 gap-2">
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Filter Dropdown Toggle */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 rounded-lg p-2 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                title="Toggle Filters"
              >
                <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </button>

              {showFilters && (
                <div className="absolute top-12 left-0 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-xl p-5 z-20 w-80 space-y-4">
                  <div className="flex items-center justify-between border-b dark:border-dark-border pb-2">
                    <h3 className="text-xs font-semibold text-gray-800 dark:text-slate-100">
                      Filter {activeTab === "whatsapp" ? "WhatsApp Messages" : "Reminder Logs"}
                    </h3>
                    <button
                      onClick={handleClearFilters}
                      className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-medium"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {activeTab === "whatsapp" ? (
                      <>
                        {/* Template Filter */}
                        <div>
                          <label className="text-xs text-ink-muted dark:text-slate-400">
                            Template / Campaign
                          </label>
                          <select
                            value={waFilters.campaignName}
                            onChange={(e) =>
                              setWaFilters((prev) => ({
                                ...prev,
                                campaignName: e.target.value,
                              }))
                            }
                            className="w-full mt-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                          >
                            <option value="">All Templates</option>
                            <option value="invoice_generated_notification">Invoice Generated Notification</option>
                            <option value="payment_reminders">Payment Reminders</option>
                            <option value="payment_received">Payment Received</option>
                            <option value="service_reminder">Service Reminder</option>
                            <option value="birthday_wish">Birthday Wish</option>
                            <option value="anniversary_wish">Anniversary Wish</option>
                            {availableTemplates.map((tpl) => (
                              !["invoice_generated_notification", "invoice_created", "payment_reminders", "payment_reminder", "payment_received", "service_reminder", "birthday_wish", "anniversary_wish"].includes(tpl) && (
                                <option key={tpl} value={tpl}>
                                  {formatTemplateName(tpl)}
                                </option>
                              )
                            ))}
                          </select>
                        </div>

                        {/* Delivery Status Filter */}
                        <div>
                          <label className="text-xs text-ink-muted dark:text-slate-400">
                            Delivery Status (DLR)
                          </label>
                          <select
                            value={waFilters.delivery_status}
                            onChange={(e) =>
                              setWaFilters((prev) => ({
                                ...prev,
                                delivery_status: e.target.value,
                              }))
                            }
                            className="w-full mt-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                          >
                            <option value="">All Delivery Statuses</option>
                            <option value="read">Read (Double Blue Check)</option>
                            <option value="delivered">Delivered (Double Check)</option>
                            <option value="sent">Sent</option>
                            <option value="failed">Failed</option>
                          </select>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-ink-muted dark:text-slate-400">
                              Date From
                            </label>
                            <input
                              type="date"
                              value={waFilters.start_date}
                              onChange={(e) =>
                                setWaFilters((prev) => ({
                                  ...prev,
                                  start_date: e.target.value,
                                }))
                              }
                              className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-ink-muted dark:text-slate-400">
                              Date To
                            </label>
                            <input
                              type="date"
                              value={waFilters.end_date}
                              onChange={(e) =>
                                setWaFilters((prev) => ({
                                  ...prev,
                                  end_date: e.target.value,
                                }))
                              }
                              className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Entity Type Filter */}
                        <div>
                          <label className="text-xs text-ink-muted dark:text-slate-400">
                            Entity Type
                          </label>
                          <select
                            value={remFilters.entity_type}
                            onChange={(e) =>
                              setRemFilters((prev) => ({
                                ...prev,
                                entity_type: e.target.value,
                              }))
                            }
                            className="w-full mt-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                          >
                            <option value="">All Types</option>
                            <option value="INVOICE">Invoice</option>
                            <option value="PRODUCT">Product</option>
                            <option value="SERVICE">Service</option>
                            <option value="CUSTOMER">Customer</option>
                          </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className="text-xs text-ink-muted dark:text-slate-400">
                            Status
                          </label>
                          <select
                            value={remFilters.message_status}
                            onChange={(e) =>
                              setRemFilters((prev) => ({
                                ...prev,
                                message_status: e.target.value,
                              }))
                            }
                            className="w-full mt-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                          >
                            <option value="">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="SENT">Sent</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="READ">Read</option>
                            <option value="FAILED">Failed</option>
                          </select>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-ink-muted dark:text-slate-400">
                              Date From
                            </label>
                            <input
                              type="date"
                              value={remFilters.start_date}
                              onChange={(e) =>
                                setRemFilters((prev) => ({
                                  ...prev,
                                  start_date: e.target.value,
                                }))
                              }
                              className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-ink-muted dark:text-slate-400">
                              Date To
                            </label>
                            <input
                              type="date"
                              value={remFilters.end_date}
                              onChange={(e) =>
                                setRemFilters((prev) => ({
                                  ...prev,
                                  end_date: e.target.value,
                                }))
                              }
                              className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex items-center space-x-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-input rounded-full px-4 py-1.5 max-w-xs shadow-sm">
              <Search className="h-4 w-4 text-gray-400 dark:text-slate-400" />
              <input
                placeholder={
                  activeTab === "whatsapp"
                    ? "Search name, phone, template..."
                    : "Search reminder logs..."
                }
                className="bg-transparent focus:outline-none text-ink-base dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 w-full text-xs"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (activeTab === "whatsapp") setWaPage(1);
                  else setRemPage(1);
                }}
              />
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-dark-card border border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(msgLogsFetching || reminderLogsLoading) ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Dynamic Stats Summary Card */}
        {activeTab === "whatsapp" && (
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border mb-5 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-dark-border">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted dark:text-slate-400">Total Messages</p>
                  <p className="text-base font-bold text-ink-base dark:text-slate-100">
                    {waSummary.total.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted dark:text-slate-400">Sent</p>
                  <p className="text-base font-bold text-ink-base dark:text-slate-100">
                    {waSummary.sent.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted dark:text-slate-400">Delivered</p>
                  <p className="text-base font-bold text-ink-base dark:text-slate-100">
                    {waSummary.delivered.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted dark:text-slate-400">Read</p>
                  <p className="text-base font-bold text-ink-base dark:text-slate-100">
                    {waSummary.read.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center shrink-0">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-ink-muted dark:text-slate-400">Failed</p>
                  <p className="text-base font-bold text-ink-base dark:text-slate-100">
                    {waSummary.failed.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "reminders" && remStats && (
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border mb-5 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-dark-border">
              {[
                {
                  label: "Total",
                  value: remStats.summary.total,
                  icon: <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
                  bg: "bg-blue-100 dark:bg-blue-900/40",
                },
                {
                  label: "Sent",
                  value: remStats.summary.sent,
                  icon: <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />,
                  bg: "bg-green-100 dark:bg-green-900/40",
                },
                {
                  label: "Delivered",
                  value: remStats.summary.delivered,
                  icon: <Send className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
                  bg: "bg-purple-100 dark:bg-purple-900/40",
                },
                {
                  label: "Failed",
                  value: remStats.summary.failed,
                  icon: <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
                  bg: "bg-red-100 dark:bg-red-900/40",
                },
                {
                  label: "Pending",
                  value: remStats.summary.pending,
                  icon: <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />,
                  bg: "bg-yellow-100 dark:bg-yellow-900/40",
                },
              ].map(({ label, value, icon, bg }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                    {icon}
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted dark:text-slate-400">{label}</p>
                    <p className="text-base font-bold text-ink-base dark:text-slate-100 leading-tight">
                      {value.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOGS CONTENT AREA */}
        {activeTab === "whatsapp" ? (
          /* WHATSAPP MESSAGE LOGS TAB */
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
            {msgLogsLoading ? (
              <div className="p-8 text-center space-y-3">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-xs text-ink-muted dark:text-slate-400">Loading WhatsApp Delivery Logs...</p>
              </div>
            ) : msgLogsError ? (
              <div className="p-6 text-center">
                <p className="text-red-600 font-medium text-sm">Failed to load WhatsApp message logs.</p>
                <Button onClick={refetchMsgLogs} className="mt-3" size="sm">
                  Retry
                </Button>
              </div>
            ) : !waLogs.length ? (
              <div className="p-12 text-center">
                <Smartphone className="w-14 h-14 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-ink-base dark:text-slate-100 mb-1">
                  No WhatsApp delivery logs found
                </h3>
                <p className="text-xs text-ink-secondary dark:text-slate-400 max-w-sm mx-auto">
                  {searchTerm || waFilters.campaignName || waFilters.delivery_status
                    ? "No logs match your current search filters. Try clearing your filters."
                    : "No WhatsApp messages have been sent yet. Outbound invoice messages and reminders will appear here."}
                </p>
              </div>
            ) : (
              <div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100 dark:bg-dark-subtle border-b dark:border-dark-border text-xs font-semibold text-gray-600 dark:text-slate-400">
                      <tr>
                        <th className="text-left px-3.5 py-3 w-10">#</th>
                        <th className="text-left px-4 py-3">Recipient & Phone</th>
                        <th className="text-left px-4 py-3">Template / Campaign</th>
                        <th className="text-left px-4 py-3">Message Content & Details</th>
                        <th className="text-left px-4 py-3">Delivery Status (DLR)</th>
                        <th className="text-left px-4 py-3">Sent & Delivered Time</th>
                        <th className="text-center px-3 py-3 w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border text-xs">
                      {waLogs.map((log, index) => {
                        const summary = extractContentSummary(log);
                        const rawReason = log.meta?.delivery_reason ?? log.meta?.error;
                        const isRealError =
                          rawReason !== null &&
                          rawReason !== undefined &&
                          rawReason !== "" &&
                          rawReason !== "0" &&
                          rawReason !== 0;

                        return (
                          <tr
                            key={log._id}
                            onClick={() => setSelectedLog(log)}
                            className="hover:bg-gray-50/80 dark:hover:bg-dark-subtle/50 transition-colors cursor-pointer group"
                          >
                            {/* Serial Number */}
                            <td className="px-3.5 py-3 text-slate-400 font-mono">
                              {(waPage - 1) * waLimit + index + 1}
                            </td>

                            {/* Recipient Info */}
                            <td className="px-4 py-3">
                              <div className="font-semibold text-ink-base dark:text-slate-100 text-sm">
                                {log.userName || summary?.customerName || "Customer"}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                                  {log.destination}
                                </span>
                                <a
                                  href={`https://wa.me/${(log.destination || "").replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Chat on WhatsApp"
                                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                  <Smartphone className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </td>

                            {/* Template Name Badge */}
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                                  {formatTemplateName(log.campaignName || log.messageType)}
                                </span>
                                {summary?.storeName && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]" title={summary.storeName}>
                                    🏪 {summary.storeName}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Message Content & Key Details */}
                            <td className="px-4 py-3">
                              {summary ? (
                                <div className="space-y-1.5 max-w-xs">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {summary.invoiceNumber && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                                        #{summary.invoiceNumber}
                                      </span>
                                    )}

                                    {(summary.amountDue || summary.totalAmount) && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                                        {formatCurrency(summary.amountDue || summary.totalAmount)}
                                      </span>
                                    )}

                                    {(summary.dueDate || summary.invoiceDate) && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-200 dark:border-amber-800">
                                        <Calendar className="w-3 h-3 text-amber-500" />
                                        {summary.dueDate ? `Due ${summary.dueDate}` : summary.invoiceDate}
                                      </span>
                                    )}

                                    {summary.document?.link && (
                                      <a
                                        href={summary.document.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800 hover:bg-rose-100"
                                        title="View Cloudinary Invoice PDF"
                                      >
                                        <FileText className="w-3 h-3 text-rose-500" />
                                        <span>PDF</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )}
                                  </div>

                                  {summary.itemOrSerial && (
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                                      Item: {summary.itemOrSerial}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                                  Template dispatched
                                </span>
                              )}
                            </td>

                            {/* Delivery Status Badge & Failure Info */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-start gap-1">
                                {getWhatsappStatusBadge(log)}
                                {isRealError && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 max-w-xs break-words">
                                    <Info className="w-3 h-3 shrink-0" />
                                    {typeof rawReason === "object"
                                      ? JSON.stringify(rawReason)
                                      : String(rawReason)}
                                  </span>
                                )}
                                {log.meta?.delivery_status === "read" && (
                                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                    Seen by recipient
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Timestamps */}
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              <div>
                                <span className="font-medium text-slate-700 dark:text-slate-300">Sent:</span>{" "}
                                {formatDate(log.createdAt)}
                              </div>
                              {log.meta?.webhook_received_at && (
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  <span>DLR:</span> {formatDate(log.meta.webhook_received_at)}
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLog(log);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:text-slate-400 dark:hover:text-blue-300 transition-colors"
                                title="View Message Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-dark-border">
                  {waLogs.map((log, index) => {
                    const summary = extractContentSummary(log);
                    const rawReason = log.meta?.delivery_reason ?? log.meta?.error;
                    const isRealError =
                      rawReason !== null &&
                      rawReason !== undefined &&
                      rawReason !== "" &&
                      rawReason !== "0" &&
                      rawReason !== 0;

                    return (
                      <div
                        key={log._id}
                        onClick={() => setSelectedLog(log)}
                        className="p-3.5 space-y-2.5 active:bg-gray-50/70 dark:active:bg-dark-subtle/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-xs text-ink-base dark:text-slate-100">
                              {log.userName || summary?.customerName || "Customer"}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                                {log.destination}
                              </span>
                              <a
                                href={`https://wa.me/${(log.destination || "").replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {getWhatsappStatusBadge(log)}
                            <span className="text-[11px] text-slate-400 font-mono">
                              #{(waPage - 1) * waLimit + index + 1}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                            {formatTemplateName(log.campaignName || log.messageType)}
                          </span>
                          {summary?.storeName && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={summary.storeName}>
                              🏪 {summary.storeName}
                            </span>
                          )}
                        </div>

                        {/* Content Summary Chips */}
                        {summary && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {summary.invoiceNumber && (
                              <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px] border border-indigo-200 dark:border-indigo-800">
                                #{summary.invoiceNumber}
                              </span>
                            )}
                            {(summary.amountDue || summary.totalAmount) && (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                                {formatCurrency(summary.amountDue || summary.totalAmount)}
                              </span>
                            )}
                            {(summary.dueDate || summary.invoiceDate) && (
                              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[10px] border border-amber-200 dark:border-amber-800">
                                {summary.dueDate ? `Due ${summary.dueDate}` : summary.invoiceDate}
                              </span>
                            )}
                            {summary.document?.link && (
                              <a
                                href={summary.document.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] border border-rose-200 dark:border-rose-800 flex items-center gap-0.5"
                              >
                                <FileText className="w-2.5 h-2.5 text-rose-500" />
                                <span>PDF</span>
                              </a>
                            )}
                          </div>
                        )}

                        {isRealError && (
                          <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded-md">
                            <strong>Reason:</strong>{" "}
                            {typeof rawReason === "object"
                              ? JSON.stringify(rawReason)
                              : String(rawReason)}
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-gray-100 dark:border-dark-border">
                          <span>Sent: {formatDate(log.createdAt)}</span>
                          {log.meta?.webhook_received_at && (
                            <span>DLR: {formatDate(log.meta.webhook_received_at)}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="w-full py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-dark-input hover:bg-blue-50 dark:hover:bg-blue-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-1 border border-gray-200/80 dark:border-dark-border transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Message & DLR Report</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pagination Controls for WhatsApp Tab */}
            {waPagination.total > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted dark:text-slate-400">
                <div className="flex items-center gap-3">
                  <span>
                    Showing {(waPagination.page - 1) * waPagination.limit + 1} to{" "}
                    {Math.min(waPagination.page * waPagination.limit, waPagination.total)} of{" "}
                    {waPagination.total} messages
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>Rows:</span>
                    <select
                      value={waLimit}
                      onChange={(e) => {
                        setWaLimit(Number(e.target.value));
                        setWaPage(1);
                      }}
                      className="px-2 py-1 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {waPagination.pages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWaPage((p) => Math.max(p - 1, 1))}
                      disabled={waPage <= 1}
                      className="p-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span>
                      Page {waPage} of {waPagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWaPage((p) => Math.min(p + 1, waPagination.pages))}
                      disabled={waPage >= waPagination.pages}
                      className="p-1.5"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* AUTOMATED REMINDER LOGS TAB */
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
            {reminderLogsError ? (
              <div className="p-6 text-center">
                <div className="text-red-600 text-sm">Failed to load reminder logs.</div>
                <Button onClick={refetchReminderLogs} className="mt-3" size="sm">
                  Retry
                </Button>
              </div>
            ) : !remLogs?.length ? (
              <div className="p-12 text-center">
                <Activity className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
                  No reminder logs found
                </h3>
                <p className="text-ink-secondary dark:text-slate-400 mb-6 text-xs">
                  {searchTerm || remFilters.entity_type || remFilters.message_status
                    ? "No logs match your search criteria."
                    : "No reminder logs are available yet."}
                </p>
              </div>
            ) : (
              <div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100 dark:bg-dark-subtle border-b dark:border-dark-border text-xs font-semibold text-gray-500 dark:text-slate-400">
                      <tr>
                        <th className="w-1/3 text-left px-4 py-3">Recipient & Entity Details</th>
                        <th className="w-1/3 text-left px-4 py-3">Message Status Details</th>
                        <th className="w-1/3 text-left px-4 py-3">Timing Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                      {remLogs.map((log, index) => (
                        <tr
                          key={log._id}
                          className="hover:bg-gray-50 dark:hover:bg-dark-subtle/50 transition-colors"
                        >
                          <td className="w-1/3 px-4 py-3 align-middle">
                            <div className="flex gap-3 items-center">
                              <span className="text-xs text-slate-400 font-mono">
                                {(remPage - 1) * remLimit + index + 1}
                              </span>
                              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center shrink-0">
                                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-ink-base dark:text-slate-100 text-xs mb-0.5 capitalize">
                                  {log.recipient_name || "N/A"}
                                </div>
                                <div className="text-xs text-ink-secondary dark:text-slate-400 font-mono">
                                  {log.recipient_number}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="w-1/3 px-4 py-3 align-middle">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-ink-secondary dark:text-slate-400">Entity:</span>
                                {getEntityTypeBadge(log.entity_type)}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-ink-secondary dark:text-slate-400">Status:</span>
                                {getReminderStatusBadge(log.message_status)}
                              </div>
                            </div>
                          </td>

                          <td className="w-1/3 px-4 py-3 align-middle text-xs text-slate-500 dark:text-slate-400">
                            <div>
                              <span className="font-medium text-slate-700 dark:text-slate-300">Sent At:</span>{" "}
                              {formatDate(log.createdAt)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-dark-border">
                  {remLogs.map((log, index) => (
                    <div key={`mobile-${log._id}`} className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-ink-base dark:text-slate-100 capitalize">
                          {log.recipient_name || "N/A"}
                        </h4>
                        {getReminderStatusBadge(log.message_status)}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          {log.recipient_number}
                        </span>
                        {getEntityTypeBadge(log.entity_type)}
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-gray-100 dark:border-dark-border">
                        <span>{formatDate(log.createdAt)}</span>
                        <span className="font-mono">#{(remPage - 1) * remLimit + index + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination Controls for Reminder Tab */}
            {remPagination.total > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted dark:text-slate-400">
                <div className="flex items-center gap-3">
                  <span>
                    Showing {(remPagination.page - 1) * remPagination.limit + 1} to{" "}
                    {Math.min(remPagination.page * remPagination.limit, remPagination.total)} of{" "}
                    {remPagination.total} logs
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>Rows:</span>
                    <select
                      value={remLimit}
                      onChange={(e) => {
                        setRemLimit(Number(e.target.value));
                        setRemPage(1);
                      }}
                      className="px-2 py-1 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-input text-ink-base dark:text-slate-200"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {remPagination.pages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRemPage((p) => Math.max(p - 1, 1))}
                      disabled={remPage <= 1}
                      className="p-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span>
                      Page {remPage} of {remPagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRemPage((p) => Math.min(p + 1, remPagination.pages))}
                      disabled={remPage >= remPagination.pages}
                      className="p-1.5"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Log Details Inspection Modal */}
        {selectedLog && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
            onClick={() => setSelectedLog(null)}
          >
            <div
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-gray-50/70 dark:bg-dark-subtle/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-ink-base dark:text-slate-100 flex items-center gap-2">
                      <span>{formatTemplateName(selectedLog.campaignName || selectedLog.messageType)}</span>
                    </h3>
                    <p className="text-xs text-ink-muted dark:text-slate-400">
                      WhatsApp Message Content & Delivery Report (DLR)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getWhatsappStatusBadge(selectedLog)}
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-dark-subtle transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Recipient & Direct WhatsApp Action */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-input/60 border border-gray-200 dark:border-dark-border flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-ink-base dark:text-slate-100 text-sm">
                        {selectedLog.userName || "Customer"}
                      </div>
                      <div className="font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        {selectedLog.destination}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${(selectedLog.destination || "").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Chat on WhatsApp
                    </a>
                  </div>
                </div>

                {/* Simulated WhatsApp Chat Bubble */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    WhatsApp Message Preview
                  </label>
                  <div className="bg-[#e5ddd5] dark:bg-[#0b141a] p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-dark-border">
                    <div className="max-w-md bg-white dark:bg-[#1f2c34] text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none p-3.5 shadow-sm space-y-2 border border-gray-100 dark:border-slate-800">
                      
                      {/* Document Header (if PDF attached) */}
                      {(() => {
                        const summary = extractContentSummary(selectedLog);
                        if (summary?.document) {
                          return (
                            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="truncate">
                                  <p className="font-bold text-xs truncate">
                                    {summary.document.filename || "Invoice Document.pdf"}
                                  </p>
                                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Attached PDF</span>
                                </div>
                              </div>
                              <a
                                href={summary.document.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] hover:bg-indigo-100 shrink-0 flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                              >
                                <span>Open PDF</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Message Body Content */}
                      {(() => {
                        const summary = extractContentSummary(selectedLog);
                        if (!summary) {
                          return (
                            <p className="text-xs text-slate-500 italic">
                              No parameter payload recorded for this message. Dispatched via standard template.
                            </p>
                          );
                        }

                        if (summary.type === "payment_reminder") {
                          return (
                            <div className="text-xs space-y-1.5 leading-relaxed">
                              <p className="font-bold text-slate-900 dark:text-white">
                                Dear {summary.customerName || selectedLog.userName || "Customer"},
                              </p>
                              <p>
                                This is a friendly reminder that a payment of{" "}
                                <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                                  {formatCurrency(summary.amountDue)}
                                </strong>{" "}
                                for Invoice{" "}
                                <span className="font-mono font-bold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                  #{summary.invoiceNumber}
                                </span>
                                {summary.itemOrSerial ? ` (${summary.itemOrSerial})` : ""} is due on{" "}
                                <span className="font-bold underline">{summary.dueDate}</span>.
                              </p>
                              {summary.storeName && (
                                <p className="text-slate-600 dark:text-slate-300 font-medium">
                                  From: <strong>{summary.storeName}</strong>
                                </p>
                              )}
                              {summary.helpline && (
                                <p className="text-[11px] text-slate-500">
                                  Helpline: {summary.helpline}
                                </p>
                              )}
                            </div>
                          );
                        }

                        if (summary.type === "invoice_generated") {
                          return (
                            <div className="text-xs space-y-1.5 leading-relaxed">
                              <p className="font-bold text-slate-900 dark:text-white">
                                Dear {summary.customerName || selectedLog.userName || "Customer"},
                              </p>
                              <p>
                                Thank you for your purchase from{" "}
                                <strong>{summary.storeName || "our store"}</strong>!
                              </p>
                              <div className="p-2 rounded-lg bg-gray-50 dark:bg-dark-card space-y-1 text-[11px] border border-gray-200/80 dark:border-dark-border">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Invoice:</span>
                                  <span className="font-mono font-bold">#{summary.invoiceNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Bill Date:</span>
                                  <span>{summary.invoiceDate}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Total:</span>
                                  <span className="font-bold">{formatCurrency(summary.totalAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Paid:</span>
                                  <span>{formatCurrency(summary.paidAmount)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-indigo-600 dark:text-indigo-400 border-t pt-1 border-dashed">
                                  <span>Balance Due:</span>
                                  <span>{formatCurrency(summary.balanceDue)} ({summary.paymentStatus})</span>
                                </div>
                              </div>
                              {summary.helpline && (
                                <p className="text-[11px] text-slate-500">
                                  Helpline: {summary.helpline}
                                </p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-1">
                            {summary.fields?.map((f) => (
                              <div key={f.key} className="text-xs">
                                <span className="text-slate-400 font-mono text-[10px] mr-1">[{f.key}]:</span>
                                <span className="font-semibold">{f.text}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Action Button inside WhatsApp bubble */}
                      {(() => {
                        const summary = extractContentSummary(selectedLog);
                        if (summary?.buttonText) {
                          return (
                            <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                              <div className="w-full text-center py-1.5 px-3 rounded-lg bg-gray-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-1.5">
                                <Phone className="w-3 h-3" />
                                <span>Action: {summary.buttonText}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Message Bubble Footer (Time & Status) */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                        <span>{new Date(selectedLog.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <CheckCheck className={`w-3.5 h-3.5 ${
                          (selectedLog.meta?.delivery_status || "").toLowerCase() === "read"
                            ? "text-purple-500"
                            : (selectedLog.meta?.delivery_status || "").toLowerCase() === "delivered"
                            ? "text-emerald-500"
                            : "text-slate-400"
                        }`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Structured Template Variables Table */}
                {(() => {
                  const content = parseLogContent(selectedLog);
                  if (!content) return null;
                  const entries = Object.entries(content);
                  if (!entries.length) return null;

                  return (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Template Variables & Parameters ({entries.length})
                      </label>
                      <div className="border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-dark-subtle text-slate-500 font-semibold border-b dark:border-dark-border">
                            <tr>
                              <th className="text-left px-3 py-2 w-28">Parameter</th>
                              <th className="text-left px-3 py-2 w-20">Type</th>
                              <th className="text-left px-3 py-2">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                            {entries.map(([k, v]) => {
                              const val = v?.text || (v?.document ? v.document.filename || v.document.link : JSON.stringify(v));
                              return (
                                <tr key={k} className="hover:bg-gray-50/50 dark:hover:bg-dark-subtle/30 font-mono">
                                  <td className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 font-bold">{k}</td>
                                  <td className="px-3 py-1.5 text-slate-400 text-[11px]">{v?.type || typeof v}</td>
                                  <td className="px-3 py-1.5 text-ink-base dark:text-slate-200 break-all font-sans font-medium">
                                    {v?.document?.link ? (
                                      <a
                                        href={v.document.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                                      >
                                        {v.document.filename || "View Attached PDF"}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      val
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Delivery & Provider Metadata */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Delivery Report (DLR) Details
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-input/60 border border-gray-200 dark:border-dark-border">
                      <span className="text-slate-400 block text-[11px]">MSG91 Request ID</span>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="font-mono font-bold text-ink-base dark:text-slate-100 truncate">
                          {selectedLog.meta?.response?.request_id || "N/A"}
                        </span>
                        {selectedLog.meta?.response?.request_id && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedLog.meta.response.request_id);
                              setCopiedRequestId(true);
                              setTimeout(() => setCopiedRequestId(false), 2000);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Copy Request ID"
                          >
                            {copiedRequestId ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-input/60 border border-gray-200 dark:border-dark-border">
                      <span className="text-slate-400 block text-[11px]">Webhook Received</span>
                      <span className="font-semibold text-ink-base dark:text-slate-100 block mt-0.5">
                        {selectedLog.meta?.webhook_received_at
                          ? formatDate(selectedLog.meta.webhook_received_at)
                          : "Awaiting callback"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-input/60 border border-gray-200 dark:border-dark-border">
                      <span className="text-slate-400 block text-[11px]">Delivery Status</span>
                      <span className="font-bold capitalize text-ink-base dark:text-slate-100 block mt-0.5">
                        {selectedLog.meta?.delivery_status || selectedLog.status || "Unknown"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-input/60 border border-gray-200 dark:border-dark-border">
                      <span className="text-slate-400 block text-[11px]">Delivery Reason Code</span>
                      <span className="font-mono text-ink-base dark:text-slate-100 block mt-0.5">
                        {selectedLog.meta?.delivery_reason === "0"
                          ? "0 (Delivered Successfully)"
                          : selectedLog.meta?.delivery_reason || "None"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Raw JSON Payload */}
                <div className="pt-2 border-t border-gray-100 dark:border-dark-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Full Log JSON Payload
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 2000);
                      }}
                      className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-3 h-3 text-green-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-subtle/50 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="px-4"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Logs;
