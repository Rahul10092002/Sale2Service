import { baseApi } from "../../services/baseApi.js";

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all users
    getUsers: builder.query({
      query: () => "/users",
      providesTags: ["User"],
      transformResponse: (response) => response.data,
    }),

    // Get user by ID
    getUserById: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: "User", id }],
      transformResponse: (response) => response.data,
    }),

    // Add new user
    addUser: builder.mutation({
      query: (userData) => ({
        url: "/users",
        method: "POST",
        body: userData,
      }),
      invalidatesTags: ["User"],
    }),

    // Update user
    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/users/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "User", id },
        "User",
      ],
    }),

    // Delete user
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),

    // --- Role Endpoints ---

    // Get all roles
    getRoles: builder.query({
      query: () => "/roles",
      providesTags: ["Role"],
      transformResponse: (response) => response.data,
    }),

    // Add new role
    createRole: builder.mutation({
      query: (roleData) => ({
        url: "/roles",
        method: "POST",
        body: roleData,
      }),
      invalidatesTags: ["Role"],
    }),

    // Update role
    updateRole: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/roles/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Role"],
    }),

    // Delete role
    deleteRole: builder.mutation({
      query: (id) => ({
        url: `/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Role"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useAddUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = userApi;
