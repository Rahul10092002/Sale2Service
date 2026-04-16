import { baseApi } from "../../services/baseApi.js";

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: (params) => ({ url: "/products", params: params || {} }),
      providesTags: (result) => [
        ...(result?.products?.map(({ _id }) => ({
          type: "Product",
          id: _id,
        })) || []),
        { type: "Product", id: "LIST" },
      ],
      // Keep product list cache for 5 minutes (changes less frequently)
      keepUnusedDataFor: 300,
      transformResponse: (response) => response.data,
    }),

    getProductById: builder.query({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
      // Keep individual product cache for 10 minutes (rarely changes)
      keepUnusedDataFor: 600,
      transformResponse: (response) => response.data,
    }),

    createProduct: builder.mutation({
      query: (payload) => ({ url: "/products", method: "POST", body: payload }),
      // Invalidate product list and top products on dashboard
      invalidatesTags: [{ type: "Product", id: "LIST" }, "TopProducts"],
      transformResponse: (response) => response.data,
    }),

    updateProduct: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body: payload,
      }),
      // Invalidate specific product, list, and dashboard
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        "TopProducts",
      ],
      transformResponse: (response) => response.data,
    }),

    deleteProduct: builder.mutation({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      // Invalidate deleted product, list, and dashboard
      invalidatesTags: (result, error, id) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        "TopProducts",
      ],
    }),

    productAutocomplete: builder.query({
      query: ({ q, limit = 10 }) => ({
        url: "/products/autocomplete",
        params: { q, limit },
      }),
      // Never cache autocomplete results — always fresh
      keepUnusedDataFor: 0,
      transformResponse: (response) => response.data,
    }),

    saveMasterProduct: builder.mutation({
      query: (payload) => ({
        url: "/products/master-save",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "InventoryItem", id: "LIST" }],
    }),

    getInventoryProducts: builder.query({
      query: (params) => ({ url: "/products/inventory", params: params || {} }),
      providesTags: (result) => [
        ...(result?.products?.map(({ _id }) => ({
          type: "InventoryItem",
          id: _id,
        })) || []),
        { type: "InventoryItem", id: "LIST" },
      ],
      transformResponse: (response) => response.data,
    }),

    updateInventoryProduct: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/products/inventory/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "InventoryItem", id },
        { type: "InventoryItem", id: "LIST" },
      ],
      transformResponse: (response) => response.data,
    }),

    deleteInventoryProduct: builder.mutation({
      query: (id) => ({
        url: `/products/inventory/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "InventoryItem", id },
        { type: "InventoryItem", id: "LIST" },
      ],
      transformResponse: (response) => response.data,
    }),
  }),
  overrideExisting: false,
});

baseApi.enhanceEndpoints({ addTagTypes: ["Product", "InventoryItem"] });

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useLazyProductAutocompleteQuery,
  useSaveMasterProductMutation,
  useGetInventoryProductsQuery,
  useUpdateInventoryProductMutation,
  useDeleteInventoryProductMutation,
} = productApi;
