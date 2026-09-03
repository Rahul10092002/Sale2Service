import { baseApi } from "../../services/baseApi.js";

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventoryItems: builder.query({
      query: (params) => ({
        url: "/inventory/items",
        params: params || {},
      }),
      providesTags: ["Inventory"],
    }),
    createReceivingSlip: builder.mutation({
      query: (payload) => ({
        url: "/inventory/receiving-slip",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Inventory", "Products", "Dashboard"],
    }),
    linkRetroactiveDealer: builder.mutation({
      query: ({ itemId, ...payload }) => ({
        url: `/inventory/items/${itemId}/link-dealer`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["Inventory", "Invoice", "Warranty"],
    }),
    updateInventoryStatus: builder.mutation({
      query: ({ itemId, ...payload }) => ({
        url: `/inventory/items/${itemId}/status`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["Inventory", "Products"],
    }),
    getInventoryAuditLogs: builder.query({
      query: (itemId) => `/inventory/items/${itemId}/logs`,
      providesTags: (result, error, itemId) => [{ type: "Inventory", id: itemId }],
    }),
  }),
});

export const {
  useGetInventoryItemsQuery,
  useCreateReceivingSlipMutation,
  useLinkRetroactiveDealerMutation,
  useUpdateInventoryStatusMutation,
  useGetInventoryAuditLogsQuery,
} = inventoryApi;
