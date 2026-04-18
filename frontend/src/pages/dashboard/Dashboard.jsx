import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
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
  const navigate = useNavigate();
  const location = useLocation();
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
      onClick: () => navigate("/invoices/new"),
    },

  ];


  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    refetchSummary();
  };

  return (
    <>
      <div className="compact min-h-screen bg-gray-50 dark:bg-dark-bg py-3 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Top Controls */}
          <div className="flex justify-end items-center gap-2 mb-3">
            <PeriodSelector value={period} onChange={setPeriod} />
            <button
              onClick={handleRefresh}
              className="flex items-center justify-center 
                bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border text-ink-secondary dark:text-slate-300
                font-medium p-1.5 rounded-lg 
                transition-colors duration-200 shadow-sm"
              title="Refresh"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${summaryLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          {/* Loading State */}
          {isLoading && (
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm dark:shadow-glass-dark border border-gray-200 dark:border-dark-border p-3 hover:shadow-md transition-all duration-200">
              <div className="px-6 py-8 text-center">
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
            <div className="space-y-3 w-full max-w-full overflow-x-hidden [&>*]:min-w-0">
              {/* Key Metrics Row */}
              <div>
                <h2 className="text-sm font-semibold text-ink-base dark:text-slate-100 mb-2">
                  Key Metrics
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2">
                  <MetricCard
                    title="Total Revenue"
                    // round off to nearest 10 for cleaner display, can adjust as needed
                    value={`₹${summary.revenue?.total || 0}`}
                    subtitle={`${summary.revenue?.count || 0} invoice${summary.revenue?.count !== 1 ? "s" : ""}`}
                    trend={summary.revenue?.changePercentage}
                    icon={IndianRupee}
                    color="blue"
                  />
                  <MetricCard
                    title="Invoices"
                    value={summary.invoices?.total || 0}
                    subtitle={`${summary.invoices?.paid?.count || 0} paid, ${summary.invoices?.unpaid?.count || 0} unpaid`}
                    icon={FileText}
                    color="purple"
                  />
                  <MetricCard
                    title="Customers"
                    value={summary.customers?.total || 0}
                    subtitle={`${summary.customers?.new || 0} new, ${summary.customers?.active || 0} active`}
                    icon={Users}
                    color="green"
                  />
                   <MetricCard
                    title="Service Visits"
                    value={summary.services?.total || 0}
                    subtitle={`${summary.services?.completed || 0} completed, ${summary.services?.scheduled || 0} scheduled`}
                    icon={Wrench}
                    color="orange"
                  />
                </div>
                 
              </div>

              {/* Service Plans, Warranties & Alerts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-2 gap-2">
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
                <div className="sm:col-span-2 2xl:col-span-2 min-w-0">
                  <AlertsPanel alerts={summary.alerts} />
                </div>
              </div>

              {/* Upcoming Reminders */}
              <div className="min-w-0">
                <UpcomingReminders
                  serviceReminders={serviceReminders}
                  warrantyReminders={warrantyReminders}
                  wishes={summary?.wishes || []}
                  festivals={summary?.festivals || []}
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
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm dark:shadow-glass-dark border border-gray-100 dark:border-dark-border p-4 sm:p-6 text-center">
              <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400">
                No data available. Start by creating your first invoice!
              </p>
              <button
                className="mt-4 bg-primary dark:bg-primary-dark text-white px-6 py-2 rounded-lg hover:bg-primary-hover transition-colors w-full sm:w-auto"
                onClick={() => navigate("/invoices/new")}
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
            onClick: () => navigate("/invoices/new"),
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
