import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from "../features/auth/authSlice.js";
import { getToken } from "../utils/token.js";
import { showToast } from "../features/ui/uiSlice.js";

// Use VITE_API_BASE_URL when available; fall back to localhost (Postman default)

const API_BASE_URL =
  import.meta.env.VITE_ENVIRONMENT === "production"
    ? import.meta.env.VITE_PROD_API_URL
    : import.meta.env.VITE_LOCAL_API_URL;

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    // Prefer token from redux state, otherwise try localStorage fallback
    const stateToken = getState().auth?.accessToken;
    const token = stateToken || getToken();

    headers.set("Content-Type", "application/json");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    console.log("Token expired or invalid, logging out...");
    // Dispatch logout action to clear auth state
    api.dispatch(logout());
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,

  tagTypes: [
    "User",
    "Shop",
    "Auth",
    "Invoice",
    "Dashboard",
    "Revenue",
    "Products",
    "ReminderLogs",
    "LogStats",
    "MessageLogs",
    "RecentActivity",
    "DashboardSummary",
    "RevenueTrend",
    "TopProducts",
    "PaymentMethodStats",
    "ServiceReminders",
    "WarrantyReminders",
    "WarrantyStats",
  ],

  // Prevent unnecessary API calls on focus/navigation
  refetchOnFocus: false,
  refetchOnReconnect: true,
  // Keep cached data for 5 minutes even if component unmounts
  keepUnusedDataFor: 300,
  endpoints: (build) => ({
    getShopProfile: build.query({
      query: () => "/shop/profile",
      providesTags: ["Shop"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (err) {
          const msg =
            err?.data?.message || err.message || "Unable to load profile";
          dispatch(showToast({ message: msg, type: "error" }));
        }
      },
    }),
    updateShopProfile: build.mutation({
      query: (data) => ({ url: "/shop/profile", method: "PUT", body: data }),
      invalidatesTags: ["Shop"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const msg = data?.message || "Updated successfully";
          dispatch(showToast({ message: msg, type: "success" }));
        } catch (err) {
          const msg = err?.data?.message || err.message || "Update failed";
          dispatch(showToast({ message: msg, type: "error" }));
        }
      },
    }),
    uploadShopLogo: build.mutation({
      query: (formData) => ({
        url: "/shop/upload-logo",
        method: "POST",
        body: formData,
        prepareHeaders: (headers) => {
          // Remove content-type header to let browser set it automatically for FormData
          headers.delete("content-type");
          return headers;
        },
      }),
      invalidatesTags: ["Shop"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const msg = data?.message || "Logo uploaded successfully";
          dispatch(showToast({ message: msg, type: "success" }));
        } catch (err) {
          const msg = err?.data?.message || err.message || "Upload failed";
          dispatch(showToast({ message: msg, type: "error" }));
        }
      },
    }),
    deleteShopLogo: build.mutation({
      query: () => ({
        url: "/shop/delete-logo",
        method: "DELETE",
      }),
      invalidatesTags: ["Shop"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const msg = data?.message || "Logo deleted successfully";
          dispatch(showToast({ message: msg, type: "success" }));
        } catch (err) {
          const msg = err?.data?.message || err.message || "Delete failed";
          dispatch(showToast({ message: msg, type: "error" }));
        }
      },
    }),

    // Logs API endpoints
    getReminderLogs: build.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, value);
          }
        });
        return `/logs/reminders?${searchParams}`;
      },
      providesTags: ["ReminderLogs"],
    }),

    getReminderStats: build.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, value);
          }
        });
        return `/logs/stats?${searchParams}`;
      },
      providesTags: ["LogStats"],
    }),

    getMessageLogs: build.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, value);
          }
        });
        return `/logs/messages?${searchParams}`;
      },
      providesTags: ["MessageLogs"],
    }),

    getRecentActivity: build.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            searchParams.append(key, value);
          }
        });
        return `/logs/recent?${searchParams}`;
      },
      providesTags: ["RecentActivity"],
    }),

    getReminderLogById: build.query({
      query: (id) => `/logs/reminders/${id}`,
      providesTags: (result, error, id) => [{ type: "ReminderLogs", id }],
    }),

    getLogsSummary: build.query({
      query: (period = "7d") => `/logs/stats?period=${period}`,
      providesTags: ["LogStats"],
    }),

    retryReminder: build.mutation({
      query: (id) => ({
        url: `/logs/reminders/${id}/retry`,
        method: "POST",
      }),
      invalidatesTags: ["ReminderLogs", "LogStats"],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetShopProfileQuery,
  useUpdateShopProfileMutation,
  useUploadShopLogoMutation,
  useDeleteShopLogoMutation,
  useGetReminderLogsQuery,
  useGetReminderStatsQuery,
  useGetMessageLogsQuery,
  useGetRecentActivityQuery,
  useGetReminderLogByIdQuery,
  useGetLogsSummaryQuery,
  useRetryReminderMutation,
} = baseApi;
