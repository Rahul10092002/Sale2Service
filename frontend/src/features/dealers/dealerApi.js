import { baseApi } from "../../services/baseApi.js";

export const dealerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDealers: builder.query({
      query: () => "/dealers",
      providesTags: ["Dealer"],
    }),
    getAllDealersHistory: builder.query({
      query: () => "/dealers/all-history",
      providesTags: ["Dealer"],
    }),
    createDealer: builder.mutation({
      query: (payload) => ({
        url: "/dealers",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Dealer"],
    }),
    updateDealer: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/dealers/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["Dealer"],
    }),
    deleteDealer: builder.mutation({
      query: (id) => ({
        url: `/dealers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Dealer"],
    }),
  }),
});

export const {
  useGetDealersQuery,
  useGetAllDealersHistoryQuery,
  useCreateDealerMutation,
  useUpdateDealerMutation,
  useDeleteDealerMutation,
} = dealerApi;
