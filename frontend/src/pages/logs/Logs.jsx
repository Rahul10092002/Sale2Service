import React, { useState, useRef, useEffect } from "react";
import {
  Activity,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Filter,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../../components/ui/index.js";
import {
  useGetReminderStatsQuery,
  useGetReminderLogsQuery,
} from "../../services/baseApi.js";

function Logs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    entity_type: "",
    message_status: "",
    start_date: "",
    end_date: "",
  });
  const filterRef = useRef(null);

  // RTK Query hooks for data fetching
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useGetReminderStatsQuery();

  const {
    data: logsData,
    isLoading: logsLoading,
    error,
    refetch: refetchLogs,
  } = useGetReminderLogsQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm,
    ...filters,
  });

  const stats = statsData?.data;
  const logs = logsData?.data?.logs || [];
  const pagination = logsData?.data?.pagination || {};

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleRefresh = () => {
    refetchStats();
    refetchLogs();
  };

  const toggleFilter = () => {
    setShowFilters(!showFilters);
  };

  // Close filter dropdown when clicking outside
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

  const getStatusBadge = (status) => {
    const badgeClasses = {
      SENT: "bg-blue-100 text-blue-800",
      DELIVERED: "bg-green-100 text-green-800",
      READ: "bg-purple-100 text-purple-800",
      FAILED: "bg-red-100 text-red-800",
      PENDING: "bg-yellow-100 text-yellow-800",
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
      INVOICE: "bg-blue-100 text-blue-800",
      PRODUCT: "bg-green-100 text-green-800",
      SERVICE: "bg-orange-100 text-orange-800",
      CUSTOMER: "bg-purple-100 text-purple-800",
    };

    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badgeClasses[entityType] || badgeClasses.INVOICE}`}
      >
        {entityType}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";

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
      console.warn("Date formatting error:", error, dateString);
      return "Invalid date";
    }
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modern Filters & Search */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border mb-6 gap-4">
          <div className="flex items-center space-x-4">
            {/* Modern Filter Icon with Dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={toggleFilter}
                className="flex items-center justify-center bg-blue-100 rounded-md p-2 hover:bg-blue-200 transition-colors"
              >
                <Filter className="h-5 w-5 text-blue-600" />
              </button>
              {showFilters && (
                <div className="absolute top-12 left-0 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-md shadow-lg p-4 z-10 w-80">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex flex-col">
                      <label className="text-sm text-ink-secondary dark:text-slate-300 font-medium mb-1">
                        Entity Type:
                      </label>
                      <select
                        value={filters.entity_type}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            entity_type: e.target.value,
                          }))
                        }
                        className="p-2 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark-border rounded-md text-sm text-ink-base dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">All Types</option>
                        <option value="INVOICE">Invoice</option>
                        <option value="PRODUCT">Product</option>
                        <option value="SERVICE">Service</option>
                        <option value="CUSTOMER">Customer</option>
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-sm text-ink-secondary dark:text-slate-300 font-medium mb-1">
                        Status:
                      </label>
                      <select
                        value={filters.message_status}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            message_status: e.target.value,
                          }))
                        }
                        className="p-2 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark-border rounded-md text-sm text-ink-base dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="SENT">Sent</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="READ">Read</option>
                        <option value="FAILED">Failed</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <label className="text-sm text-ink-secondary dark:text-slate-300 font-medium mb-1">
                          Date From:
                        </label>
                        <input
                          type="date"
                          value={filters.start_date}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              start_date: e.target.value,
                            }))
                          }
                          className="p-2 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark-border rounded-md text-sm text-ink-base dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm text-ink-secondary dark:text-slate-300 font-medium mb-1">
                          Date To:
                        </label>
                        <input
                          type="date"
                          value={filters.end_date}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              end_date: e.target.value,
                            }))
                          }
                          className="p-2 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark-border rounded-md text-sm text-ink-base dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modern Search Bar */}
            <div className="flex items-center space-x-3 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-input rounded-full px-4 py-2 max-w-xs shadow-sm">
              <Search className="h-5 w-5 text-gray-500 dark:text-slate-400" />
              <input
                placeholder="Search logs..."
                className="bg-transparent focus:outline-none text-ink-base dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 w-full text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-500 text-blue-500 rounded-md text-sm font-medium hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border mb-6">
            <div className="flex flex-wrap divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-dark-border">
              {[
                {
                  label: "Total",
                  value: stats.summary.total,
                  icon: <MessageSquare className="w-4 h-4 text-blue-600" />,
                  bg: "bg-blue-100",
                },
                {
                  label: "Sent",
                  value: stats.summary.sent,
                  icon: <CheckCircle className="w-4 h-4 text-green-600" />,
                  bg: "bg-green-100",
                },
                {
                  label: "Delivered",
                  value: stats.summary.delivered,
                  icon: <Send className="w-4 h-4 text-purple-600" />,
                  bg: "bg-purple-100",
                },
                {
                  label: "Failed",
                  value: stats.summary.failed,
                  icon: <XCircle className="w-4 h-4 text-red-600" />,
                  bg: "bg-red-100",
                },
                {
                  label: "Pending",
                  value: stats.summary.pending,
                  icon: <Clock className="w-4 h-4 text-yellow-600" />,
                  bg: "bg-yellow-100",
                },
              ].map(({ label, value, icon, bg }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-5 py-3 flex-1 min-w-[140px]"
                >
                  <div
                    className={`w-8 h-8 ${bg} rounded-full flex items-center justify-center shrink-0`}
                  >
                    {icon}
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted dark:text-slate-500">{label}</p>
                    <p className="text-base font-semibold text-ink-base dark:text-slate-100 leading-tight">
                      {value.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs List */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
          {error ? (
            <div className="p-6 text-center">
              <div className="text-red-600">
                Failed to load logs. Please try again.
              </div>
              <Button onClick={refetchLogs} className="mt-4">
                Retry
              </Button>
            </div>
          ) : !logs?.length ? (
            <div className="p-12 text-center">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
                No logs found
              </h3>
              <p className="text-ink-secondary dark:text-slate-400 mb-6">
                {searchTerm || filters.entity_type || filters.message_status
                  ? "No logs match your search criteria."
                  : "No reminder logs are available yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="min-w-full">
                  <thead className="bg-gray-200 dark:bg-dark-subtle border-b dark:border-dark-border">
                    <tr>
                      <th className="w-1/3 text-left px-4 py-3 text-sm font-semibold text-ink-secondary dark:text-slate-400">
                        Recipient & Entity Details
                      </th>
                      <th className="w-1/3 text-left px-4 py-3 text-sm font-semibold text-ink-secondary dark:text-slate-400">
                        Message & Status Details
                      </th>
                      <th className="w-1/3 text-left px-4 py-3 text-sm font-semibold text-ink-secondary dark:text-slate-400">
                        Timing & Retry Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr
                        key={log._id}
                        className={`${
                          index % 2 === 0 ? "bg-white dark:bg-dark-card" : "bg-gray-100 dark:bg-dark-subtle"
                        } border-b border-gray-100 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-subtle transition-colors`}
                      >
                        {/* Recipient & Entity Details */}
                        <td className="w-1/3 px-4 py-4 align-top">
                          <div className="flex gap-3 items-start">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-ink-base dark:text-slate-100 text-sm mb-2 capitalize">
                                {log.recipient_name || "N/A"}
                              </div>
                              <div className="text-xs text-ink-secondary dark:text-slate-400 space-y-1">
                                <p className="wrap-break-word">
                                  <span className="font-medium">Phone:</span>{" "}
                                  {log.recipient_number}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">Entity:</span>
                                  {getEntityTypeBadge(log.entity_type)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Message & Status Details */}
                        <td className="w-1/3 px-4 py-4 align-top">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-ink-secondary dark:text-slate-400">
                                Status:
                              </span>
                              {getStatusBadge(log.message_status)}
                            </div>
                            <div className="text-xs text-ink-secondary dark:text-slate-400 space-y-2">
                              <p className="break-words">
                                <span className="font-medium">Template:</span>{" "}
                                {log.template_name || "N/A"}
                              </p>
                              {log.message_content && (
                                <div>
                                  <p className="font-medium mb-1">Message:</p>
                                  <div className="text-xs bg-gray-100 dark:bg-dark-subtle p-2 rounded border dark:border-dark-border italic max-h-16 overflow-y-auto ">
                                    "{log.message_content}"
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Timing & Retry Details */}
                        <td className="w-1/3 px-4 py-4 align-top">
                          <div className="text-xs space-y-2">
                            <div className="space-y-1">
                              <p className="font-medium text-ink-secondary dark:text-slate-300 mb-1">
                                Timing:
                              </p>
                              <p className="text-ink-secondary dark:text-slate-400 break-words">
                                <span className="font-medium">Created:</span>
                                &nbsp;
                                {formatDate(log.createdAt)}
                              </p>
                              <p className="text-ink-secondary dark:text-slate-400 break-words">
                                <span className="font-medium">Sent:</span>&nbsp;
                                {log.sent_at
                                  ? formatDate(log.sent_at)
                                  : "Not sent"}
                              </p>
                              {log.updatedAt &&
                                log.updatedAt !== log.createdAt && (
                                  <p className="text-ink-secondary dark:text-slate-400 break-words">
                                    <span className="font-medium">
                                      Updated:
                                    </span>
                                    &nbsp;
                                    {formatDate(log.updatedAt)}
                                  </p>
                                )}
                            </div>
                            <div className="pt-1 border-t border-gray-200 dark:border-dark-border">
                              <p className="font-medium text-ink-secondary dark:text-slate-300 mb-1">
                                Retry Info:
                              </p>
                              <p className="text-ink-secondary dark:text-slate-400">
                                <span className="font-medium">Attempts:</span>
                                &nbsp;
                                {log.retry_count}/{log.max_retries}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              {logs.map((log, index) => (
                <div key={`mobile-${log._id}`} className="md:hidden">
                  <div
                    className={`${
                      index % 2 === 0 ? "bg-white dark:bg-dark-card" : "bg-gray-200 dark:bg-dark-subtle"
                    } border-b border-gray-100 dark:border-dark-border p-4 `}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-bold text-ink-base dark:text-slate-100 capitalize">
                            {log.recipient_name || "N/A"}
                          </div>
                          <div className="text-sm text-ink-secondary dark:text-slate-400">
                            #{(currentPage - 1) * 10 + index + 1}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {getEntityTypeBadge(log.entity_type)}
                        {getStatusBadge(log.message_status)}
                      </div>
                    </div>

                    {/* Recipient & Entity Details */}
                    <div className="mb-4">
                      <h4 className="font-medium text-ink-base dark:text-slate-100 text-sm mb-2">
                        Recipient & Entity Details
                      </h4>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="font-medium text-ink-secondary dark:text-slate-400">
                            Phone:
                          </span>{" "}
                          {log.recipient_number}
                        </p>
                        <p>
                          <span className="font-medium text-ink-secondary dark:text-slate-400">
                            Entity Type:
                          </span>{" "}
                          {log.entity_type}
                        </p>
                      </div>
                    </div>

                    {/* Message & Status Details */}
                    <div className="mb-4">
                      <h4 className="font-medium text-ink-base dark:text-slate-100 text-sm mb-2">
                        Message & Status Details
                      </h4>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="font-medium text-ink-secondary dark:text-slate-400">
                            Template:
                          </span>{" "}
                          {log.template_name || "N/A"}
                        </p>
                        <p>
                          <span className="font-medium text-ink-secondary dark:text-slate-400">
                            Status:
                          </span>{" "}
                          {log.message_status}
                        </p>
                        {log.message_content && (
                          <div>
                            <p className="font-medium text-ink-secondary dark:text-slate-400 mb-1">
                              Message:
                            </p>
                            <p className="text-xs bg-gray-50 dark:bg-dark-input p-2 rounded border dark:border-dark-border italic">
                              "{log.message_content}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timing & Retry Details */}
                    <div>
                      <h4 className="font-medium text-ink-base dark:text-slate-100 text-sm mb-2">
                        Timing & Retry Details
                      </h4>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="font-medium text-ink-secondary dark:text-slate-400">
                            Created:
                          </span>{" "}
                          {formatDate(log.createdAt)}
                        </p>
                        <p>
                          <span className="font-medium text-ink-secondary dark:text-slate-400">
                            Sent:
                          </span>{" "}
                          {log.sent_at ? formatDate(log.sent_at) : "Not sent"}
                        </p>
                        {log.updatedAt && log.updatedAt !== log.createdAt && (
                          <p>
                            <span className="font-medium text-ink-secondary dark:text-slate-400">
                              Updated:
                            </span>{" "}
                            {formatDate(log.updatedAt)}
                          </p>
                        )}
                        <p>
                          <span className="font-medium text-ink-secondary dark:text-slate-400">
                            Retry Attempts:
                          </span>{" "}
                          {log.retry_count}/{log.max_retries}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {logs.length === 0 && !logsLoading && (
                <div className="text-center py-8 bg-white border-t">
                  <div className="text-ink-secondary dark:text-slate-400 text-lg">No logs found</div>
                  <div className="text-ink-muted dark:text-slate-500 text-sm mt-2">
                    Try adjusting your filters to see more results
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card ">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-ink-muted dark:text-slate-100">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} logs
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 rounded-md bg-white dark:bg-dark-card border hover:bg-gray-50 disabled:opacity-50 dark:border-dark-border"

                  >
                    <ChevronLeft className="w-4 h-4 dark:text-slate-100" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: pagination.pages },
                      (_, i) => i + 1,
                    ).map((pageNum) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        pageNum === 1 ||
                        pageNum === pagination.pages ||
                        Math.abs(pageNum - pagination.page) <= 1;

                      if (!showPage) {
                        // Show ellipsis
                        if (
                          pageNum === pagination.page - 2 ||
                          pageNum === pagination.page + 2
                        ) {
                          return (
                            <span
                              key={pageNum}
                              className="px-2 py-1 text-sm text-ink-secondary dark:text-slate-100"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 p-0 text-sm rounded ${pageNum === pagination.page ? "bg-indigo-600 text-white" : "bg-white border dark:bg-dark-card dark:border-dark-border"}`} 
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-1 rounded-md bg-white dark:bg-dark-card border hover:bg-gray-50 disabled:opacity-50 dark:border-dark-border"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Simple pagination info when only 1 page */}
          {pagination.pages <= 1 && logs.length > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input">
              <div className="text-sm text-ink-secondary dark:text-slate-400 text-center">
                Showing {pagination.total || 0} of {pagination.total || 0} logs
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Logs;
