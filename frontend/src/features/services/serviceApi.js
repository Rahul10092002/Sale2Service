import { baseApi } from "../../services/baseApi.js";

export const serviceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Removed unused endpoints: getServiceDashboard, getServiceSchedules

    // Get services organized by product
    getServicesByProduct: builder.query({
      query: (params) => ({
        url: "/services/by-product",
        params: params || {},
      }),
      providesTags: ["ServiceSchedule", "ServicePlan"],
      transformResponse: (response) => response.data,
    }),

    // Reschedule a service
    rescheduleService: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/services/schedules/${id}/reschedule`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ServiceSchedule", "ServiceDashboard"],
      transformResponse: (response) => response.data,
    }),

    // Mark service as complete
    markServiceComplete: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/services/schedules/${id}/complete`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ServiceSchedule", "ServiceDashboard", "ServiceVisit"],
      transformResponse: (response) => response.data,
    }),

    // Cancel a service
    cancelService: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/services/schedules/${id}/cancel`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ServiceSchedule", "ServiceDashboard"],
      transformResponse: (response) => response.data,
    }),

    // Removed unused endpoints: createServiceVisit, getServiceVisits,
    // getServicePlans, createServicePlan, updateServicePlan, deleteServicePlan
  }),
  overrideExisting: false,
});

export const {
  // Only export the used service API hooks
  useGetServicesByProductQuery,
  useRescheduleServiceMutation,
  useMarkServiceCompleteMutation,
  useCancelServiceMutation,
} = serviceApi;
