import { baseApi } from "../../services/baseApi.js";

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: (params) => ({ url: "/products", params: params || {} }),
      providesTags: ["Product"],
      transformResponse: (response) => response.data,
    }),

    getProductById: builder.query({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
      transformResponse: (response) => response.data,
    }),

    createProduct: builder.mutation({
      query: (payload) => ({ url: "/products", method: "POST", body: payload }),
      invalidatesTags: ["Product"],
      transformResponse: (response) => response.data,
    }),

    updateProduct: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["Product"],
      transformResponse: (response) => response.data,
    }),

    deleteProduct: builder.mutation({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: ["Product"],
    }),
  }),
  overrideExisting: false,
});

baseApi.enhanceEndpoints({ addTagTypes: ["Product"] });

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
