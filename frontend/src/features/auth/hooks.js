import { useSelector, useDispatch } from "react-redux";
import {
  selectCurrentUser,
  selectCurrentToken,
  selectShopId,
  selectUserRole,
  selectIsAuthenticated,
  setCredentials,
  logout as logoutAction,
} from "./authSlice.js";
import {
  authApi,
  useLoginMutation,
  useSignupMutation,
  useGetCurrentUserQuery,
  useLogoutMutation,
} from "./authApi.js";

/**
 * Custom hook for authentication state and actions
 * Provides a clean interface for components to interact with auth
 */
export const useAuth = () => {
  const dispatch = useDispatch();

  // Auth selectors
  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
  const shopId = useSelector(selectShopId);
  const role = useSelector(selectUserRole);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // API mutations
  const [loginMutation, { isLoading: isLoginLoading, error: loginError }] =
    useLoginMutation();
  const [signupMutation, { isLoading: isSignupLoading, error: signupError }] =
    useSignupMutation();
  const [logoutMutation] = useLogoutMutation();

  /**
   * Handle user login
   * @param {Object} credentials - Login credentials
   * @returns {Promise} Login result
   */
  const login = async (credentials) => {
    try {
      // Map frontend fields to backend expected keys
      const payload = {
        email_or_phone:
          credentials.emailOrMobile ||
          credentials.email_or_phone ||
          credentials.email,
        password: credentials.password,
      };

      const result = await loginMutation(payload).unwrap();
      dispatch(setCredentials(result));
      return result;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Handle user signup
   * @param {Object} signupData - Signup information
   * @returns {Promise} Signup result
   */
  const signup = async (signupData) => {
    try {
      // Map frontend form keys to backend payload keys for signup-owner
      const payload = {
        owner_name: signupData.ownerName || signupData.owner_name,
        email: signupData.email,
        phone: signupData.mobileNumber || signupData.phone,
        password: signupData.password,
        shop_name: signupData.shopName || signupData.shop_name,
        business_type:
          signupData.businessType || signupData.business_type || "",
      };

      const result = await signupMutation(payload).unwrap();
      dispatch(setCredentials(result));
      return result;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Handle user logout
   * Optionally calls server logout endpoint
   */
  const logout = async (callServer = false) => {
    try {
      if (callServer && token) {
        await logoutMutation().unwrap();
      }
    } catch (error) {
      console.error("Server logout failed:", error);
    } finally {
      // Always clear local state regardless of server response
      dispatch(logoutAction());
      // Clear all API cached responses to load fresh data on next login
      dispatch(authApi.util.resetApiState());
    }
  };

  return {
    // State
    user,
    token,
    shopId,
    role,
    isAuthenticated,

    // Loading states
    isLoginLoading,
    isSignupLoading,

    // Error states
    loginError,
    signupError,

    // Actions
    login,
    signup,
    logout,
  };
};

/**
 * Hook to get current user data with automatic refetching
 * Only fetches when user is authenticated
 */
export const useCurrentUser = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return useGetCurrentUserQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true,
  });
};
