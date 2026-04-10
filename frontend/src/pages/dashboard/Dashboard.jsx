import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { USER_ROLES } from "../../utils/constants.js";
import FAB from "../../components/ui/FAB.jsx";
import ShortcutGrid from "../../components/ui/ShortcutGrid.jsx";
import MetricCard from "../../components/ui/MetricCard.jsx";
import {
  RecentActivity,
  AlertsPanel,
  PeriodSelector,
  UpcomingReminders,
} from "../../components/dashboard/index.js";
import {
  useGetDashboardSummaryQuery,
  useGetRecentActivityQuery,
  useGetUpcomingServiceRemindersQuery,
  useGetUpcomingWarrantyRemindersQuery,
  useGetWarrantyStatsQuery,
} from "../../services/dashboardApi.js";
import {
  IndianRupee,
  FileText,
  Users,
  Wrench,
  Package,
  RefreshCw,
  Shield,
} from "lucide-react";

const Dashboard = () => {
  const { user, role } = useAuth();
  const [period, setPeriod] = useState("today");

  // Fetch dashboard data
  const {
    data: summaryData,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useGetDashboardSummaryQuery(period);
  const { data: recentActivityData } = useGetRecentActivityQuery(8);
  const { data: serviceRemindersData } =
    useGetUpcomingServiceRemindersQuery(period);
  const { data: warrantyRemindersData } =
    useGetUpcomingWarrantyRemindersQuery(period);
  const { data: warrantyStatsData } = useGetWarrantyStatsQuery();

  const summary = summaryData?.data;
  const recentActivity = recentActivityData?.data || [];
  const serviceReminders = serviceRemindersData?.data || [];
  const warrantyReminders = warrantyRemindersData?.data || [];
  const warrantyStats = warrantyStatsData?.data;

  // Check if main data is loading
  const isLoading = summaryLoading;

  // Shortcut items — quick actions NOT directly reachable from the sidebar.
  const shortcutItems = [
    {
      label: "New Invoice",
      onClick: () => (window.location.href = "/invoices/new"),
    },

  ];

  /**
   * Get role-specific welcome message
   */
  const getWelcomeMessage = () => {
    if (role === USER_ROLES.OWNER) {
      return "Welcome to your sales dashboard";
    }
    if (role === USER_ROLES.STAFF) {
      return "Welcome to your staff dashboard";
    }
    return "Welcome to the portal";
  };

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    refetchSummary();
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-6 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Section */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm dark:shadow-glass-dark border border-gray-200 dark:border-dark-border
  p-4 sm:p-6 hover:shadow-md transition-all duration-200 mb-6">

  {/* Top Section */}
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

    {/* Left Content */}
    <div className="flex-1 min-w-0">
      <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold 
        bg-gradient-to-r from-blue-600 to-green-600 
        bg-clip-text text-transparent mb-1 sm:mb-2 leading-tight">
        {getWelcomeMessage()}
      </h1>

      <p className="text-xs sm:text-sm lg:text-base text-ink-secondary dark:text-slate-400">
        Manage Sales & Warranty in One Place
      </p>
    </div>

    {/* Right Controls */}
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">

      {/* Period Selector */}
      <div className="w-full sm:flex-1 lg:w-auto">
        <div className="w-full overflow-x-auto no-scrollbar">
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={handleRefresh}
        className="w-full sm:w-auto flex items-center justify-center 
          bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:hover:bg-dark-border text-ink-secondary dark:text-slate-300
          font-medium px-4 py-2 rounded-lg 
          transition-colors duration-200"
        title="Refresh"
      >
        <RefreshCw
          className={`w-5 h-5 ${summaryLoading ? "animate-spin" : ""}`}
        />
      </button>
    </div>

  </div>
</div>
          {/* Loading State */}
          {isLoading && (
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm dark:shadow-glass-dark border border-gray-200 dark:border-dark-border p-4 hover:shadow-md transition-all duration-200">
              <div className="px-6 py-4 text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-4">
                  <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
                <h3 className="text-lg font-medium text-ink-base dark:text-slate-100 mb-2">
                  Loading Dashboard
                </h3>
                <p className="text-ink-secondary dark:text-slate-400">Fetching your latest data...</p>
              </div>
            </div>
          )}

          {/* Dashboard Content */}
          {!isLoading && summary && (
            <div className="space-y-6 w-full max-w-full overflow-x-hidden [&>*]:min-w-0">
              {/* Key Metrics Row */}
              <div>
                <h2 className="text-lg font-semibold text-ink-base dark:text-slate-100 mb-4">
                  Key Metrics
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MetricCard
                    title="Total Revenue"
                    // round off to nearest 10 for cleaner display, can adjust as needed
                    value={`₹${Math.round(summary.revenue?.total / 10) * 10 || 0}`}
                    subtitle={`${summary.revenue?.count || 0} invoice${summary.revenue?.count !== 1 ? "s" : ""}`}
                    trend={summary.revenue?.changePercentage}
                    icon={IndianRupee}
                    color="blue"
                    onClick={() => (window.location.href = "/invoices")}
                  />
                  <MetricCard
                    title="Invoices"
                    value={summary.invoices?.total || 0}
                    subtitle={`${summary.invoices?.paid?.count || 0} paid, ${summary.invoices?.unpaid?.count || 0} unpaid`}
                    icon={FileText}
                    color="purple"
                    onClick={() => (window.location.href = "/invoices")}
                  />
                  <MetricCard
                    title="Customers"
                    value={summary.customers?.total || 0}
                    subtitle={`${summary.customers?.new || 0} new, ${summary.customers?.active || 0} active`}
                    icon={Users}
                    color="green"
                    onClick={() => (window.location.href = "/customers")}
                  />
                   <MetricCard
                    title="Service Visits"
                    value={summary.services?.total || 0}
                    subtitle={`${summary.services?.completed || 0} completed, ${summary.services?.scheduled || 0} scheduled`}
                    icon={Wrench}
                    color="orange"
                    onClick={() => (window.location.href = "/services")}
                  />
                </div>
                 
              </div>

              {/* Service Plans, Warranties & Alerts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
                {summary.servicePlans && (
                  <MetricCard
                    title="Active Service Plans"
                    value={summary.servicePlans?.active || 0}
                    subtitle={`${summary.servicePlans?.expiring || 0} expiring soon`}
                    icon={Package}
                    color="blue"
                  />
                )}
                {warrantyStats && (
                  <MetricCard
                    title="Active Warranties"
                    value={warrantyStats.total || 0}
                    subtitle={`${warrantyStats.expiringThisWeek || 0} expiring this week`}
                    icon={Shield}
                    color="purple"
                  />
                )}
                <div className="sm:col-span-2 2xl:col-span-1 min-w-0">
                  <AlertsPanel alerts={summary.alerts} />
                </div>
              </div>

              {/* Upcoming Reminders */}
              <div className="min-w-0">
                <UpcomingReminders
                  serviceReminders={serviceReminders}
                  warrantyReminders={warrantyReminders}
                  period={period}
                />
              </div>

              {/* Charts Section */}
              {/* <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 sm:gap-6">
                <div className="min-w-0">
                  <RevenueTrendChart data={revenueTrend} />
                </div>
                <div className="min-w-0">
                  <InvoiceStatusChart data={summary.invoices} />
                </div>
              </div> */}

              {/* <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 sm:gap-6">
                <div className="min-w-0">
                  <TopProductsChart data={topProducts} />
                </div>
                <div className="min-w-0">
                  <PaymentMethodsChart data={paymentMethods} />
                </div>
              </div> */}

              {/* Recent Activity */}
              <div className="min-w-0">
                <RecentActivity data={recentActivity} limit={5} />
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !summary && (
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-gray-100 dark:border-dark-border p-6 sm:p-12 text-center">
              <p className="text-sm sm:text-base text-ink-secondary dark:text-slate-400">
                No data available. Start by creating your first invoice!
              </p>
              <button
                className="mt-4 bg-primary dark:bg-primary-dark text-white px-6 py-2 rounded-lg hover:bg-primary-hover transition-colors w-full sm:w-auto"
                onClick={() => (window.location.href = "/invoices/new")}
              >
                Create Invoice
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating action button for quick actions */}
      <FAB
        actions={[
          {
            label: "New Invoice",
            onClick: () => (window.location.href = "/invoices/new"),
          },
          {
            label: "Refresh Data",
            onClick: handleRefresh,
          },
        ]}
      />
    </>
  );
};

export default Dashboard;
