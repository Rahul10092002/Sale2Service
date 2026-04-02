import { baseApi } from "../../services/baseApi.js";

export const festivalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Create festival schedule
    createFestival: builder.mutation({
      query: (data) => ({
        url: "/festival-schedule",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Festival", id: "LIST" }],
    }),

    // Get all festival schedules with pagination and search
    getFestivals: builder.query({
      query: ({ page = 1, limit = 10, search = "" } = {}) =>
        `/festival-schedule?page=${page}&limit=${limit}${search ? `&search=${search}` : ""}`,
      providesTags: (result) => [
        ...(result?.data?.schedules?.map(({ _id }) => ({
          type: "Festival",
          id: _id,
        })) || []),
        { type: "Festival", id: "LIST" },
      ],
    }),

    // Get single festival schedule by ID
    getFestivalById: builder.query({
      query: (id) => `/festival-schedule/${id}`,
      providesTags: (result, error, id) => [{ type: "Festival", id }],
    }),

    // Update festival schedule
    updateFestival: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/festival-schedule/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Festival", id },
        { type: "Festival", id: "LIST" },
      ],
    }),

    // Delete festival schedule
    deleteFestival: builder.mutation({
      query: (id) => ({
        url: `/festival-schedule/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Festival", id },
        { type: "Festival", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useCreateFestivalMutation,
  useGetFestivalsQuery,
  useGetFestivalByIdQuery,
  useUpdateFestivalMutation,
  useDeleteFestivalMutation,
} = festivalApi;
