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

  const formatTemplateName = (name) => {
    if (!name) return "General Message";
    const templatesMap = {
      invoice_generated_notification: "Invoice Generated Notification",
      invoice_created: "Invoice Created",
      payment_reminder: "Payment Reminder",
      service_reminder: "Service Reminder",
      birthday_wish: "Birthday Wish",
      anniversary_wish: "Anniversary Wish",
      custom_notification: "Custom Notification",
      manual_message: "Manual Message",
    };
    if (templatesMap[name]) return templatesMap[name];
    return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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
                            <option value="payment_reminder">Payment Reminder</option>
                            <option value="service_reminder">Service Reminder</option>
                            <option value="birthday_wish">Birthday Wish</option>
                            <option value="anniversary_wish">Anniversary Wish</option>
                            {availableTemplates.map((tpl) => (
                              !["invoice_generated_notification", "invoice_created", "payment_reminder", "service_reminder", "birthday_wish", "anniversary_wish"].includes(tpl) && (
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
                        <th className="text-left px-4 py-3">#</th>
                        <th className="text-left px-4 py-3">Recipient & Phone</th>
                        <th className="text-left px-4 py-3">Template / Campaign</th>
                        <th className="text-left px-4 py-3">Delivery Status (DLR)</th>
                        <th className="text-left px-4 py-3">Sent & Delivered Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border text-xs">
                      {waLogs.map((log, index) => {
                        const deliveryReason = log.meta?.delivery_reason || log.meta?.error;
                        return (
                          <tr
                            key={log._id}
                            className="hover:bg-gray-50 dark:hover:bg-dark-subtle/50 transition-colors"
                          >
                            {/* Serial Number */}
                            <td className="px-4 py-3 text-slate-400 font-mono">
                              {(waPage - 1) * waLimit + index + 1}
                            </td>

                            {/* Recipient Info */}
                            <td className="px-4 py-3">
                              <div className="font-semibold text-ink-base dark:text-slate-100 text-sm">
                                {log.userName || "Customer"}
                              </div>
                              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                                {log.destination}
                              </div>
                            </td>

                            {/* Template Name Badge */}
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                                <Layers className="w-3.5 h-3.5 text-blue-500" />
                                {formatTemplateName(log.campaignName || log.messageType)}
                              </span>
                            </td>

                            {/* Delivery Status Badge & Failure Info */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-start gap-1">
                                {getWhatsappStatusBadge(log)}
                                {deliveryReason && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 max-w-xs break-words">
                                    <Info className="w-3 h-3 shrink-0" />
                                    {typeof deliveryReason === "object"
                                      ? JSON.stringify(deliveryReason)
                                      : String(deliveryReason)}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Timestamps */}
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                              <div>
                                <span className="font-medium text-slate-700 dark:text-slate-300">Sent:</span>{" "}
                                {formatDate(log.createdAt)}
                              </div>
                              {log.meta?.webhook_received_at && (
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  <span>DLR Update:</span> {formatDate(log.meta.webhook_received_at)}
                                </div>
                              )}
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
                    const deliveryReason = log.meta?.delivery_reason || log.meta?.error;
                    return (
                      <div key={log._id} className="p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-xs text-ink-base dark:text-slate-100">
                              {log.userName || "Customer"}
                            </h4>
                            <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                              {log.destination}
                            </p>
                          </div>
                          {getWhatsappStatusBadge(log)}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                            {formatTemplateName(log.campaignName || log.messageType)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            #{(waPage - 1) * waLimit + index + 1}
                          </span>
                        </div>

                        {deliveryReason && (
                          <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded-md">
                            <strong>Reason:</strong>{" "}
                            {typeof deliveryReason === "object"
                              ? JSON.stringify(deliveryReason)
                              : String(deliveryReason)}
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-gray-100 dark:border-dark-border">
                          <span>Sent: {formatDate(log.createdAt)}</span>
                          {log.meta?.webhook_received_at && (
                            <span>DLR: {formatDate(log.meta.webhook_received_at)}</span>
                          )}
                        </div>
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

      </div>
    </div>
  );
}

export default Logs;
