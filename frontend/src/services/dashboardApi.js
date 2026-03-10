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
      providesTags: ["Dashboard"],
    }),

    /**
     * Get revenue trend data for charts
     */
    getRevenueTrend: builder.query({
      query: (days = 30) => ({
        url: "/dashboard/revenue-trend",
        params: { days },
      }),
      providesTags: ["Dashboard", "Revenue"],
    }),

    /**
     * Get top products
     */
    getTopProducts: builder.query({
      query: (limit = 5) => ({
        url: "/dashboard/top-products",
        params: { limit },
      }),
      providesTags: ["Dashboard", "Products"],
    }),

    /**
     * Get recent activity
     */
    getRecentActivity: builder.query({
      query: (limit = 10) => ({
        url: "/dashboard/recent-activity",
        params: { limit },
      }),
      providesTags: ["Dashboard"],
    }),

    /**
     * Get payment method statistics
     */
    getPaymentMethodStats: builder.query({
      query: (period = "month") => ({
        url: "/dashboard/payment-methods",
        params: { period },
      }),
      providesTags: ["Dashboard"],
    }),

    /**
     * Get invoice statistics
     */
    getInvoiceStats: builder.query({
      query: (period = "today") => ({
        url: "/dashboard/invoice-stats",
        params: { period },
      }),
      providesTags: ["Dashboard", "Invoice"],
    }),

    /**
     * Get upcoming service reminders
     */
    getUpcomingServiceReminders: builder.query({
      query: (period = "today") => ({
        url: "/dashboard/service-reminders",
        params: { period },
      }),
      providesTags: ["Dashboard"],
    }),

    /**
     * Get upcoming warranty reminders
     */
    getUpcomingWarrantyReminders: builder.query({
      query: (period = "today") => ({
        url: "/dashboard/warranty-reminders",
        params: { period },
      }),
      providesTags: ["Dashboard"],
    }),

    /**
     * Get warranty statistics
     */
    getWarrantyStats: builder.query({
      query: () => "/dashboard/warranty-stats",
      providesTags: ["Dashboard"],
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
