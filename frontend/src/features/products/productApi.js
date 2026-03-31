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

    // Barcode lookup: check own DB then fall back to upcitemdb public API.
    // Use the lazy variant so it only fires on demand.
    lookupBarcode: builder.query({
      query: (code) => ({ url: "/products/barcode-lookup", params: { code } }),
      // Never cache barcodes — each lookup should be fresh
      keepUnusedDataFor: 0,
      transformResponse: (response) => response,
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
  useLazyLookupBarcodeQuery,
} = productApi;
