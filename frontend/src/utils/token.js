/**
 * Token management utilities for localStorage
 * Provides secure token storage and retrieval
 */

const TOKEN_KEY = "sales_portal_token";
const USER_KEY = "sales_portal_user";
const SHOP_KEY = "sales_portal_shop";

/**
 * Get token from localStorage
 * @returns {string|null} The stored token or null
 */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error("Error getting token from localStorage:", error);
    return null;
  }
};

/**
 * Store token in localStorage
 * @param {string} token - JWT token to store
 */
export const setToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("Error setting token in localStorage:", error);
  }
};

/**
 * Remove token from localStorage
 */
export const removeToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("Error removing token from localStorage:", error);
  }
};

/**
 * Get user data from localStorage
 * @returns {Object|null} The stored user data or null
 */
export const getUser = () => {
  try {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Error getting user from localStorage:", error);
    return null;
  }
};

/**
 * Store user data in localStorage
 * @param {Object} user - User data to store
 */
export const setUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch (error) {
    console.error("Error setting user in localStorage:", error);
  }
};

/**
 * Remove user data from localStorage
 */
export const removeUser = () => {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error("Error removing user from localStorage:", error);
  }
};

/**
 * Get shop ID from localStorage
 * @returns {string|null} The stored shop ID or null
 */
export const getShopId = () => {
  try {
    return localStorage.getItem(SHOP_KEY);
  } catch (error) {
    console.error("Error getting shop ID from localStorage:", error);
    return null;
  }
};

/**
 * Store shop ID in localStorage
 * @param {string} shopId - Shop ID to store
 */
export const setShopId = (shopId) => {
  try {
    if (shopId) {
      localStorage.setItem(SHOP_KEY, shopId);
    }
  } catch (error) {
    console.error("Error setting shop ID in localStorage:", error);
  }
};

/**
 * Remove shop ID from localStorage
 */
export const removeShopId = () => {
  try {
    localStorage.removeItem(SHOP_KEY);
  } catch (error) {
    console.error("Error removing shop ID from localStorage:", error);
  }
};

/**
 * Clear all authentication data from localStorage
 */
export const clearAuthData = () => {
  removeToken();
  removeUser();
  removeShopId();
};

/**
 * Check if token exists
 * @returns {boolean} True if token exists
 */
export const hasToken = () => {
  return !!getToken();
};

/**
 * Decode JWT token (simple base64 decode - use proper JWT library in production)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload
 */
export const decodeToken = (token) => {
  try {
    if (!token) return null;

    const payload = token.split(".")[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired
 */
export const isTokenExpired = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true;
  }
};
