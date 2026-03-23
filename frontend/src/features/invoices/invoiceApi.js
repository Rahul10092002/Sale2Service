import { baseApi } from "../../services/baseApi.js";

export const invoiceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all invoices
    getInvoices: builder.query({
      query: (params) => ({
        url: "/invoices",
        params: params || {},
      }),
      providesTags: (result) => [
        ...(result?.map(({ _id }) => ({ type: "Invoice", id: _id })) || []),
        { type: "Invoice", id: "LIST" },
      ],
      // Keep invoice list cache for 3 minutes
      keepUnusedDataFor: 180,
      transformResponse: (response) => response.data,
    }),

    // Get invoice by ID
    getInvoiceById: builder.query({
      query: (id) => `/invoices/${id}`,
      providesTags: (result, error, id) => [{ type: "Invoice", id }],
      // Keep individual invoice cache for 5 minutes
      keepUnusedDataFor: 300,
      transformResponse: (response) => response.data,
    }),

    // Create new invoice
    createInvoice: builder.mutation({
      query: (invoiceData) => ({
        url: "/invoices",
        method: "POST",
        body: invoiceData,
      }),
      // Only invalidate the invoice list, not individual cached invoices
      invalidatesTags: [
        { type: "Invoice", id: "LIST" },
        "DashboardSummary",
        "InvoiceStats",
      ],
      transformResponse: (response) => response.data,
    }),

    // Update invoice
    updateInvoice: builder.mutation({
      query: ({ id, ...invoiceData }) => ({
        url: `/invoices/${id}`,
        method: "PUT",
        body: invoiceData,
      }),
      // Invalidate specific invoice and the list
      invalidatesTags: (result, error, { id }) => [
        { type: "Invoice", id },
        { type: "Invoice", id: "LIST" },
        "DashboardSummary",
        "InvoiceStats",
      ],
      transformResponse: (response) => response.data,
    }),

    // Delete invoice
    deleteInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoices/${id}`,
        method: "DELETE",
      }),
      // Invalidate deleted invoice and the list
      invalidatesTags: (result, error, id) => [
        { type: "Invoice", id },
        { type: "Invoice", id: "LIST" },
        "DashboardSummary",
        "InvoiceStats",
      ],
    }),

    // Get next invoice number
    getNextInvoiceNumber: builder.query({
      query: () => "/invoices/next-number",
      transformResponse: (response) => response.data,
    }),

    // Check if serial number exists
    checkSerialNumber: builder.mutation({
      query: (serialNumber) => ({
        url: "/invoices/check-serial",
        method: "POST",
        body: { serial_number: serialNumber },
      }),
      transformResponse: (response) => response.data,
    }),

    // Search customer by WhatsApp number
    searchCustomer: builder.mutation({
      query: (whatsappNumber) => ({
        url: "/invoices/search-customer",
        method: "POST",
        body: { whatsapp_number: whatsappNumber },
      }),
      transformResponse: (response) => response.data,
    }),

    // Upload invoice attachments
    uploadInvoiceAttachment: builder.mutation({
      query: ({ invoiceId, formData }) => ({
        url: `/invoices/${invoiceId}/attachments`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Invoice"],
      transformResponse: (response) => response.data,
    }),

    // Send invoice via WhatsApp
    sendInvoice: builder.mutation({
      query: (invoiceId) => ({
        url: `/invoices/${invoiceId}/send`,
        method: "POST",
      }),
      transformResponse: (response) => response.data,
    }),

    // Get services for a specific invoice item
    getInvoiceItemServices: builder.query({
      query: ({ invoiceId, itemId }) =>
        `/invoices/${invoiceId}/items/${itemId}/services`,
      providesTags: (result, error, { invoiceId, itemId }) => [
        { type: "Invoice", id: invoiceId },
        { type: "ServiceSchedule", id: itemId },
      ],
      transformResponse: (response) => response.data,
    }),

    // Download invoice PDF
    downloadInvoicePDF: builder.mutation({
      query: (invoiceId) => ({
        url: `/invoices/${invoiceId}/pdf`,
        method: "GET",
        responseHandler: (response) => response.blob(), // Return blob for download
      }),
    }),

    // Preview invoice PDF (returns blob for inline viewing)
    previewInvoicePDF: builder.mutation({
      query: (invoiceId) => ({
        url: `/invoices/${invoiceId}/preview`,
        method: "GET",
        responseHandler: (response) => response.blob(), // Return blob for preview
      }),
    }),
  }),
  overrideExisting: false,
});

// Update the baseApi tagTypes
baseApi.enhanceEndpoints({
  addTagTypes: ["Invoice"],
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceByIdQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useSendInvoiceMutation,
  useGetNextInvoiceNumberQuery,
  useCheckSerialNumberMutation,
  useSearchCustomerMutation,
  useUploadInvoiceAttachmentMutation,
  useGetInvoiceItemServicesQuery,
  useDownloadInvoicePDFMutation,
  usePreviewInvoicePDFMutation,
} = invoiceApi;
