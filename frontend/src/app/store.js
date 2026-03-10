import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "../services/baseApi.js";
import authReducer from "../features/auth/authSlice.js";
import invoiceReducer from "../features/invoices/invoiceSlice.js";
import serviceReducer from "../features/services/serviceSlice.js";
import uiReducer from "../features/ui/uiSlice.js";

/**
 * Redux store configuration with RTK Query setup
 * - Includes baseApi reducer and middleware
 * - Sets up auth slice for state management
 * - Enables RTK Query features like refetchOnFocus
 */
export const store = configureStore({
  reducer: {
    // Add the generated reducer as a specific top-level slice
    [baseApi.reducerPath]: baseApi.reducer,
    // Auth slice for user authentication state
    auth: authReducer,
    // Invoice slice for invoice form state
    invoice: invoiceReducer,
    // Service slice for service management state
    service: serviceReducer,
    // UI slice for global toasts
    ui: uiReducer,
  },
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [baseApi.util.resetApiState.type],
      },
    }).concat(baseApi.middleware),
});

// optional, but required for refetchOnFocus/refetchOnReconnect behaviors
// see `setupListeners` docs - takes an optional callback as the 2nd arg for customization
setupListeners(store.dispatch);
