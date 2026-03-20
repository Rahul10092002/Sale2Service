import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { USER_ROLES } from "../../utils/constants.js";
import Button from "../../components/ui/Button.jsx";
import FAB from "../../components/ui/FAB.jsx";
import ShortcutGrid from "../../components/ui/ShortcutGrid.jsx";
import MetricCard from "../../components/ui/MetricCard.jsx";
import {
  RevenueTrendChart,
  InvoiceStatusChart,
  TopProductsChart,
  PaymentMethodsChart,
  RecentActivity,
  AlertsPanel,
  PeriodSelector,
  UpcomingReminders,
} from "../../components/dashboard/index.js";
import {
  useGetDashboardSummaryQuery,
  useGetRevenueTrendQuery,
  useGetTopProductsQuery,
  useGetRecentActivityQuery,
  useGetPaymentMethodStatsQuery,
  useGetUpcomingServiceRemindersQuery,
  useGetUpcomingWarrantyRemindersQuery,
  useGetWarrantyStatsQuery,
} from "../../services/dashboardApi.js";
import {
  DollarSign,
  FileText,
  Users,
  Wrench,
  Package,
  RefreshCw,
  Shield,
} from "lucide-react";

const Dashboard = () => {
  const { user, role, logout } = useAuth();
  const [period, setPeriod] = useState("today");

  // Fetch dashboard data
  const {
    data: summaryData,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useGetDashboardSummaryQuery(period);
  const { data: revenueTrendData } = useGetRevenueTrendQuery(30);
  const { data: topProductsData } = useGetTopProductsQuery(5);
  const { data: recentActivityData } = useGetRecentActivityQuery(8);
  const { data: paymentMethodsData } = useGetPaymentMethodStatsQuery("month");
  const { data: serviceRemindersData } =
    useGetUpcomingServiceRemindersQuery(period);
  const { data: warrantyRemindersData } =
    useGetUpcomingWarrantyRemindersQuery(period);
  const { data: warrantyStatsData } = useGetWarrantyStatsQuery();

  const summary = summaryData?.data;
  const revenueTrend = revenueTrendData?.data || [];
  const topProducts = topProductsData?.data || [];
  const recentActivity = recentActivityData?.data || [];
  const paymentMethods = paymentMethodsData?.data || [];
  const serviceReminders = serviceRemindersData?.data || [];
  const warrantyReminders = warrantyRemindersData?.data || [];
  const warrantyStats = warrantyStatsData?.data;

  // Check if main data is loading
  const isLoading = summaryLoading;

  // Shortcut items for pinned grid (mobile-first). Role-aware items added for owners.
  const shortcutItems = [
    {
      label: "New Invoice",
      onClick: () => (window.location.href = "/invoices/new"),
    },
    {
      label: "Quick Payment",
      onClick: () => (window.location.href = "/payments/new"),
    },
    {
      label: "Find Customer",
      onClick: () => (window.location.href = "/customers"),
    },
    { label: "Products", onClick: () => (window.location.href = "/products") },
    {
      label: "Start Visit",
      onClick: () => (window.location.href = "/services"),
    },
    {
      label: "Reminders",
      onClick: () => (window.location.href = "/reminders"),
    },
    { label: "Reports", onClick: () => (window.location.href = "/reports") },
  ];

  if (role === USER_ROLES.OWNER) {
    shortcutItems.push({
      label: "Shop Settings",
      onClick: () => (window.location.href = "/shops/settings"),
    });
  }

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await logout(true); // Call server logout
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

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
      <div className="w-full space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 truncate">
                {getWelcomeMessage()}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                {user?.full_name || user?.email}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <PeriodSelector value={period} onChange={setPeriod} />
                <button
                  onClick={handleRefresh}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                  title="Refresh"
                >
                  <RefreshCw
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 ${summaryLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
              <Button
                variant="danger"
                onClick={handleLogout}
                className="w-full sm:w-auto"
              >
                Logout
              </Button>
            </div>
          </div>

          {/* Pinned shortcuts */}
          <div className="mt-3 sm:mt-4">
            <ShortcutGrid items={shortcutItems} />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8 sm:py-12">
            <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              Loading dashboard...
            </p>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && summary && (
          <>
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard
                title="Revenue"
                value={`₹${summary.revenue?.total?.toLocaleString("en-IN") || 0}`}
                subtitle={`${summary.revenue?.count || 0} invoice${summary.revenue?.count !== 1 ? "s" : ""}`}
                trend={summary.revenue?.changePercentage}
                icon={DollarSign}
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

            {/* Service Plans, Warranties & Alerts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
              <div className="sm:col-span-2 lg:col-span-1">
                <AlertsPanel alerts={summary.alerts} />
              </div>
            </div>

            {/* Upcoming Reminders */}
            <UpcomingReminders
              serviceReminders={serviceReminders}
              warrantyReminders={warrantyReminders}
              period={period}
            />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <RevenueTrendChart data={revenueTrend} />
              <InvoiceStatusChart data={summary.invoices} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <TopProductsChart data={topProducts} />
              <PaymentMethodsChart data={paymentMethods} />
            </div>

            {/* Recent Activity */}
            <RecentActivity data={recentActivity} limit={5} />
          </>
        )}

        {/* Empty State */}
        {!isLoading && !summary && (
          <div className="bg-white rounded-lg shadow p-6 sm:p-12 text-center">
            <p className="text-sm sm:text-base text-gray-500">
              No data available. Start by creating your first invoice!
            </p>
            <Button
              variant="primary"
              className="mt-4 w-full sm:w-auto"
              onClick={() => (window.location.href = "/invoices/new")}
            >
              Create Invoice
            </Button>
          </div>
        )}
      </div>

      {/* Floating action button for quick actions */}
      <FAB
        actions={[
          {
            label: "New Invoice",
            onClick: () => (window.location.href = "/invoices/new"),
          },
          {
            label: "Quick Payment",
            onClick: () => (window.location.href = "/payments/new"),
          },
          {
            label: "Add Customer",
            onClick: () => (window.location.href = "/customers/new"),
          },
          {
            label: "Scan Receipt",
            onClick: () => alert("Open scanner - implement"),
          },
        ]}
      />
    </>
  );
};

export default Dashboard;
