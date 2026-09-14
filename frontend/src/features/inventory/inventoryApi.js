import { baseApi } from "../../services/baseApi.js";

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPurchases: builder.query({
      query: (params) => ({
        url: "/inventory/purchases",
        params: params || {},
      }),
      providesTags: ["Inventory"],
    }),
    getInventoryItems: builder.query({
      query: (params) => ({
        url: "/inventory/items",
        params: params || {},
      }),
      providesTags: ["Inventory"],
    }),
    getInventoryItemById: builder.query({
      query: (itemId) => `/inventory/items/${itemId}`,
      providesTags: (result, error, itemId) => [{ type: "Inventory", id: itemId }],
    }),
    getReceivingSlipById: builder.query({
      query: (slipId) => `/inventory/receiving-slips/${slipId}`,
      providesTags: (result, error, slipId) => [{ type: "Inventory", id: slipId }],
    }),
    createReceivingSlip: builder.mutation({
      query: (payload) => ({
        url: "/inventory/receiving-slip",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Inventory", "Products", "Dashboard"],
    }),
    updateReceivingSlip: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/inventory/receiving-slips/${id}`,
        method: "PUT",
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
    deleteInventoryItem: builder.mutation({
      query: (itemId) => ({
        url: `/inventory/items/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Inventory", "Products", "Dashboard"],
    }),
    getInventoryAuditLogs: builder.query({
      query: (itemId) => `/inventory/items/${itemId}/logs`,
      providesTags: (result, error, itemId) => [{ type: "Inventory", id: itemId }],
    }),
  }),
});

export const {
  useGetPurchasesQuery,
  useGetInventoryItemsQuery,
  useGetInventoryItemByIdQuery,
  useGetReceivingSlipByIdQuery,
  useCreateReceivingSlipMutation,
  useUpdateReceivingSlipMutation,
  useLinkRetroactiveDealerMutation,
  useUpdateInventoryStatusMutation,
  useDeleteInventoryItemMutation,
  useGetInventoryAuditLogsQuery,
} = inventoryApi;

