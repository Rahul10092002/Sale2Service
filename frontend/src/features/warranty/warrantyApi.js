import { baseApi } from "../../services/baseApi.js";

export const warrantyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    lookupWarranty: builder.query({
      query: (query) => `/warranty/lookup?query=${encodeURIComponent(query)}`,
      providesTags: ["Warranty"],
    }),
    getWarrantySuggestions: builder.query({
      query: (query = "") =>
        `/warranty/suggestions?query=${encodeURIComponent(query)}`,
      providesTags: ["WarrantySuggestions"],
    }),
  }),
});

export const {
  useLazyLookupWarrantyQuery,
  useLookupWarrantyQuery,
  useGetWarrantySuggestionsQuery,
  useLazyGetWarrantySuggestionsQuery,
} = warrantyApi;
