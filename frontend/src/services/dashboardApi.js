import { baseApi } from "./baseApi.js";

/**
 * Dashboard API Service
 * Provides endpoints for fetching dashboard data and metrics
 */

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get dashboard summary with all key metrics
     */
    getDashboardSummary: builder.query({
      query: (period = "today") => ({
        url: "/dashboard/summary",
        params: { period },
      }),
      providesTags: ["DashboardSummary"],
      // Keep summary cache for 2 minutes
      keepUnusedDataFor: 120,
    }),

    /**
     * Get revenue trend data for charts
     */
    getRevenueTrend: builder.query({
      query: (days = 30) => ({
        url: "/dashboard/revenue-trend",
        params: { days },
      }),
      providesTags: ["RevenueTrend"],
      // Keep revenue data cache for 3 minutes
      keepUnusedDataFor: 180,
    }),

    /**
     * Get top products
     */
    getTopProducts: builder.query({
      query: (limit = 5) => ({
        url: "/dashboard/top-products",
        params: { limit },
      }),
      providesTags: ["TopProducts"],
      // Keep products cache for 3 minutes
      keepUnusedDataFor: 180,
    }),

    /**
     * Get recent activity
     */
    getRecentActivity: builder.query({
      query: (limit = 10) => ({
        url: "/dashboard/recent-activity",
        params: { limit },
      }),
      providesTags: ["RecentActivity"],
      // Keep activity cache for 1 minute (more dynamic data)
      keepUnusedDataFor: 60,
    }),

    /**
     * Get payment method statistics
     */
    getPaymentMethodStats: builder.query({
      query: (period = "month") => ({
        url: "/dashboard/payment-methods",
        params: { period },
      }),
      providesTags: ["PaymentMethodStats"],
      // Keep payment stats cache for 5 minutes
      keepUnusedDataFor: 300,
    }),

    /**
     * Get invoice statistics
     */
    getInvoiceStats: builder.query({
      query: (period = "today") => ({
        url: "/dashboard/invoice-stats",
        params: { period },
      }),
      providesTags: ["InvoiceStats"],
      // Keep invoice stats cache for 3 minutes
      keepUnusedDataFor: 180,
    }),

    /**
     * Get upcoming service reminders
     */
    getUpcomingServiceReminders: builder.query({
      query: (period = "today") => ({
        url: "/dashboard/service-reminders",
        params: { period },
      }),
      providesTags: ["ServiceReminders"],
      // Keep reminder cache for 2 minutes
      keepUnusedDataFor: 120,
    }),

    /**
     * Get upcoming warranty reminders
     */
    getUpcomingWarrantyReminders: builder.query({
      query: (period = "today") => ({
        url: "/dashboard/warranty-reminders",
        params: { period },
      }),
      providesTags: ["WarrantyReminders"],
      // Keep warranty reminder cache for 2 minutes
      keepUnusedDataFor: 120,
    }),

    /**
     * Get warranty statistics
     */
    getWarrantyStats: builder.query({
      query: () => "/dashboard/warranty-stats",
      providesTags: ["WarrantyStats"],
      // Keep warranty stats cache for 5 minutes
      keepUnusedDataFor: 300,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDashboardSummaryQuery,
  useGetRevenueTrendQuery,
  useGetTopProductsQuery,
  useGetRecentActivityQuery,
  useGetPaymentMethodStatsQuery,
  useGetInvoiceStatsQuery,
  useGetUpcomingServiceRemindersQuery,
  useGetUpcomingWarrantyRemindersQuery,
  useGetWarrantyStatsQuery,
} = dashboardApi;
