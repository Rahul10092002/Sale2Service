import { baseApi } from "../../services/baseApi.js";

export const warrantyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    lookupWarranty: builder.query({
      query: (query) => `/warranty/lookup?query=${encodeURIComponent(query)}`,
      providesTags: ["Warranty"],
    }),
  }),
});

export const { useLazyLookupWarrantyQuery, useLookupWarrantyQuery } = warrantyApi;
