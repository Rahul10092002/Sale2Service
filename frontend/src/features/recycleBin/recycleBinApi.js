import { baseApi } from "../../services/baseApi.js";

export const recycleBinApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRecycleBinItems: builder.query({
      query: (params) => {
        const { entity_type = "all", search = "", page = 1, limit = 25 } = params || {};
        return {
          url: "/recycle-bin",
          method: "GET",
          params: { entity_type, search, page, limit },
        };
      },
      providesTags: ["RecycleBin"],
    }),
    restoreRecycleBinItem: builder.mutation({
      query: ({ entity_type, id }) => ({
        url: "/recycle-bin/restore",
        method: "PUT",
        body: { entity_type, id },
      }),
      invalidatesTags: [
        "RecycleBin",
        "Invoice",
        "Customer",
        "Products",
        "Inventory",
        "Dealer",
        "User",
        "Dashboard",
        "DashboardSummary",
      ],
    }),
    permanentlyDeleteRecycleBinItem: builder.mutation({
      query: ({ entity_type, id }) => ({
        url: "/recycle-bin/permanent",
        method: "DELETE",
        body: { entity_type, id },
      }),
      invalidatesTags: ["RecycleBin"],
    }),
    emptyRecycleBin: builder.mutation({
      query: ({ entity_type = "all" } = {}) => ({
        url: "/recycle-bin/empty",
        method: "DELETE",
        body: { entity_type },
      }),
      invalidatesTags: ["RecycleBin"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetRecycleBinItemsQuery,
  useRestoreRecycleBinItemMutation,
  usePermanentlyDeleteRecycleBinItemMutation,
  useEmptyRecycleBinMutation,
} = recycleBinApi;
