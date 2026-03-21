import { createSlice } from "@reduxjs/toolkit";
import {
  getToken,
  setToken,
  removeToken,
  getUser,
  setUser,
  getShopId,
  setShopId,
  clearAuthData,
} from "../../utils/token.js";

/**
 * Initial auth state
 * Attempts to rehydrate token and user data from localStorage on app start
 */
const initialState = {
  accessToken: getToken() || null,
  user: getUser() || null,
  shopId: getShopId() || null,
  role: getUser()?.role || null,
  isAuthenticated: !!getToken() && !!getUser(),
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

      // Persist data to localStorage
      setToken(accessToken);
      setUser(user);
      if (shopId) {
        setShopId(shopId);
      }
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

      // Update localStorage
      setUser(user);
      if (shopId) {
        setShopId(shopId);
      }
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

      // Remove all data from localStorage
      clearAuthData();
    },

    /**
     * Rehydrate auth state from localStorage (on app initialization)
     */
    rehydrateAuth: (state) => {
      const token = getToken();
      const user = getUser();
      const shopId = getShopId();

      if (token && user) {
        // Restore complete authentication state
        state.accessToken = token;
        state.user = user;
        state.shopId = shopId;
        state.role = user.role || null;
        state.isAuthenticated = true;
      } else {
        // If token or user data is missing, clear state
        state.accessToken = null;
        state.user = null;
        state.shopId = null;
        state.role = null;
        state.isAuthenticated = false;

        // Clear potentially corrupted localStorage data
        if (!token || !user) {
          clearAuthData();
        }
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
