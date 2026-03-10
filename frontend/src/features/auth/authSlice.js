import { createSlice } from "@reduxjs/toolkit";
import { getToken, setToken, removeToken } from "../../utils/token.js";

/**
 * Initial auth state
 * Attempts to rehydrate token from localStorage on app start
 */
const initialState = {
  accessToken: getToken() || null,
  user: null,
  shopId: null,
  role: null,
  isAuthenticated: !!getToken(),
};

/**
 * Auth slice for managing authentication state
 * Handles login, logout, and credential management
 */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /**
     * Set user credentials after successful login/signup
     * @param {Object} action.payload - Contains user, accessToken, and shopId
     */
    setCredentials: (state, action) => {
      const { user, accessToken, shopId } = action.payload;

      // Update Redux state
      state.accessToken = accessToken;
      state.user = user;
      state.shopId = shopId;
      state.role = user?.role || null;
      state.isAuthenticated = true;

      // Persist token to localStorage
      setToken(accessToken);
    },

    /**
     * Update user information without changing token
     * @param {Object} action.payload - Updated user data
     */
    updateUser: (state, action) => {
      const { user, shopId } = action.payload;
      state.user = user;
      state.shopId = shopId;
      state.role = user?.role || null;
    },

    /**
     * Clear all authentication data (logout)
     */
    logout: (state) => {
      state.accessToken = null;
      state.user = null;
      state.shopId = null;
      state.role = null;
      state.isAuthenticated = false;

      // Remove token from localStorage
      removeToken();
    },

    /**
     * Rehydrate auth state from localStorage (on app initialization)
     */
    rehydrateAuth: (state) => {
      const token = getToken();
      if (token) {
        state.accessToken = token;
        state.isAuthenticated = true;
      } else {
        // If no token, ensure state is clean
        state.accessToken = null;
        state.isAuthenticated = false;
      }
    },
  },
});

// Export actions
export const { setCredentials, updateUser, logout, rehydrateAuth } =
  authSlice.actions;

// Export selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentToken = (state) => state.auth.accessToken;
export const selectShopId = (state) => state.auth.shopId;
export const selectUserRole = (state) => state.auth.role;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthState = (state) => state.auth;

// Export reducer
export default authSlice.reducer;
