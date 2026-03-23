import { baseApi } from "../../services/baseApi.js";

export const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query({
      query: (params) => ({ url: "/customers", params: params || {} }),
      providesTags: (result) => [
        ...(result?.map(({ _id }) => ({ type: "Customer", id: _id })) || []),
        { type: "Customer", id: "LIST" },
      ],
      // Keep customer list cache for 3 minutes
      keepUnusedDataFor: 180,
      transformResponse: (response) => response.data,
    }),

    getCustomerById: builder.query({
      query: (id) => `/customers/${id}`,
      providesTags: (result, error, id) => [{ type: "Customer", id }],
      // Keep individual customer cache for 5 minutes
      keepUnusedDataFor: 300,
      transformResponse: (response) => response.data,
    }),

    createCustomer: builder.mutation({
      query: (payload) => ({
        url: "/customers",
        method: "POST",
        body: payload,
      }),
      // Only invalidate the customer list
      invalidatesTags: [{ type: "Customer", id: "LIST" }],
      transformResponse: (response) => response.data,
    }),

    updateCustomer: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/customers/${id}`,
        method: "PUT",
        body: payload,
      }),
      // Invalidate specific customer and the list
      invalidatesTags: (result, error, { id }) => [
        { type: "Customer", id },
        { type: "Customer", id: "LIST" },
      ],
      transformResponse: (response) => response.data,
    }),

    deleteCustomer: builder.mutation({
      query: (id) => ({ url: `/customers/${id}`, method: "DELETE" }),
      // Invalidate deleted customer and the list
      invalidatesTags: (result, error, id) => [
        { type: "Customer", id },
        { type: "Customer", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

baseApi.enhanceEndpoints({ addTagTypes: ["Customer"] });

export const {
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} = customerApi;
