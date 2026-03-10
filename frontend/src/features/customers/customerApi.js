import { baseApi } from "../../services/baseApi.js";

export const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query({
      query: (params) => ({ url: "/customers", params: params || {} }),
      providesTags: ["Customer"],
      transformResponse: (response) => response.data,
    }),

    getCustomerById: builder.query({
      query: (id) => `/customers/${id}`,
      providesTags: (result, error, id) => [{ type: "Customer", id }],
      transformResponse: (response) => response.data,
    }),

    createCustomer: builder.mutation({
      query: (payload) => ({
        url: "/customers",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Customer"],
      transformResponse: (response) => response.data,
    }),

    updateCustomer: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/customers/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["Customer"],
      transformResponse: (response) => response.data,
    }),

    deleteCustomer: builder.mutation({
      query: (id) => ({ url: `/customers/${id}`, method: "DELETE" }),
      invalidatesTags: ["Customer"],
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
