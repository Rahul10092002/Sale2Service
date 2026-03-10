import { baseApi } from "../../services/baseApi.js";

/**
 * Auth API endpoints using RTK Query
 * Handles all authentication-related API calls
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * User signup mutation
     * @param {Object} signupData - User signup information
     * @returns {Object} User data and token
     */
    signup: builder.mutation({
      query: (signupData) => ({
        // Backend signup-owner endpoint (creates shop + owner)
        url: "/auth/signup-owner",
        method: "POST",
        body: signupData,
      }),
      invalidatesTags: ["Auth"],
      // Transform response to a consistent shape: { user, accessToken, shopId }
      transformResponse: (response) => {
        // Expected backend shape: { success: true, message, data: { user_id, shop_id, role, token } }
        const data = response?.data || response;
        return {
          user: {
            id: data?.user_id || data?.user?.id,
            role: data?.role || data?.user?.role,
            // other fields may not be returned at signup; frontend can refetch /auth/me
          },
          accessToken: data?.token || data?.accessToken,
          shopId: data?.shop_id || data?.shopId,
        };
      },
    }),

    /**
     * User login mutation
     * @param {Object} loginData - Login credentials (email/mobile + password)
     * @returns {Object} User data and token
     */
    login: builder.mutation({
      query: (loginData) => ({
        url: "/auth/login",
        method: "POST",
        body: loginData,
      }),
      invalidatesTags: ["Auth"],
      // Transform response to a consistent shape
      transformResponse: (response) => {
        // Expected backend shape: { success:true, message, data: { token, user } }
        const data = response?.data || response;
        return {
          accessToken: data?.token || data?.accessToken,
          user: data?.user || data,
          shopId: data?.user?.shop_id || data?.shop_id || data?.user?.shopId,
        };
      },
    }),

    /**
     * Get current user information
     * @returns {Object} Current user data
     */
    getCurrentUser: builder.query({
      query: () => "/auth/me",
      providesTags: ["User", "Auth"],
      transformResponse: (response) => {
        // Handle both { data: { user, shop_id } } and direct { user } shapes
        const data = response?.data || response;
        return {
          user: data?.user || data,
          shopId: data?.shop_id || data?.shopId,
        };
      },
    }),

    /**
     * Logout mutation (optional - for server-side logout)
     * @returns {Object} Success message
     */
    logout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth", "User"],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in functional components
export const {
  useSignupMutation,
  useLoginMutation,
  useGetCurrentUserQuery,
  useLogoutMutation,
} = authApi;
