import { baseApi } from "../../services/baseApi.js";

export const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query({
      query: (params) => ({ url: "/customers", params: params || {} }),
      providesTags: (result) => [
        ...(result?.customers?.map(({ _id }) => ({
          type: "Customer",
          id: _id,
        })) || []),
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

    getCustomerLedger: builder.query({
      query: ({ id, ...params }) => ({
        url: `/customers/${id}/ledger`,
        params: params || {},
      }),
      providesTags: (result, error, { id }) => [
        { type: "Customer", id: `${id}-LEDGER` },
        { type: "Invoice", id: "LIST" },
      ],
      keepUnusedDataFor: 180,
      transformResponse: (response) => response.data,
    }),

    getCustomerPayments: builder.query({
      query: ({ id, ...params }) => ({
        url: `/customers/${id}/payments`,
        params: params || {},
      }),
      providesTags: (result, error, { id }) => [
        { type: "Customer", id: `${id}-PAYMENTS` },
        { type: "Customer", id },
      ],
      keepUnusedDataFor: 180,
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

    recordCustomerPayment: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/customers/${id}/record-payment`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Customer", id },
        { type: "Customer", id: `${id}-LEDGER` },
        { type: "Customer", id: `${id}-PAYMENTS` },
        { type: "Customer", id: "LIST" },
        { type: "Invoice", id: "LIST" },
        "Invoice",
        "DashboardSummary",
        "InvoiceStats",
      ],
    }),

    reversePayment: builder.mutation({
      query: ({ receiptId, reason }) => ({
        url: `/customers/payments/${receiptId}/reverse`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: [
        { type: "Customer", id: "LIST" },
        { type: "Invoice", id: "LIST" },
        "Customer",
        "Invoice",
        "DashboardSummary",
        "InvoiceStats",
      ],
      transformResponse: (response) => response,
    }),

    getAllCustomersLedgerSummary: builder.query({
      query: () => "/customers/ledger-summary",
      providesTags: [
        { type: "Customer", id: "LEDGER_SUMMARY" },
        { type: "Invoice", id: "LIST" },
      ],
      keepUnusedDataFor: 120,
      transformResponse: (response) => response.data,
    }),

    sendCustomerPaymentReminder: builder.mutation({
      query: ({ id, category, force }) => ({
        url: `/customers/${id}/send-payment-reminder`,
        method: "POST",
        body: { category, force },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Customer", id: `${id}-LEDGER` },
      ],
      transformResponse: (response) => response,
    }),

    exportPendingCustomersLedgerPdf: builder.mutation({
      query: (params) => ({
        url: "/customers/export-pending-ledger-pdf",
        method: "GET",
        params: params || {},
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
  overrideExisting: false,
});

baseApi.enhanceEndpoints({ addTagTypes: ["Customer"] });

export const {
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useGetCustomerLedgerQuery,
  useGetCustomerPaymentsQuery,
  useGetAllCustomersLedgerSummaryQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useRecordCustomerPaymentMutation,
  useReversePaymentMutation,
  useSendCustomerPaymentReminderMutation,
  useExportPendingCustomersLedgerPdfMutation,
} = customerApi;
