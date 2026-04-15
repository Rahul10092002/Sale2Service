import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  rehydrateAuth,
  selectIsAuthenticated,
} from "../features/auth/authSlice.js";
import { useCurrentUser } from "../features/auth/hooks.js";
import { updateUser } from "../features/auth/authSlice.js";
import { ROUTES } from "../utils/constants.js";

// Components
import PrivateRoute from "./PrivateRoute.jsx";
import Login from "../pages/auth/Login.jsx";
import Signup from "../pages/auth/Signup.jsx";
import Dashboard from "../pages/dashboard/Dashboard.jsx";
import Users from "../pages/users/Users.jsx";
import InvoiceList from "../pages/invoices/InvoiceList.jsx";
import InvoiceGeneration from "../pages/invoices/InvoiceGeneration.jsx";
import InvoiceView from "../pages/invoices/InvoiceView.jsx";
import InvoiceEdit from "../pages/invoices/InvoiceEdit.jsx";
import Customers from "../pages/customers/Customers.jsx";
import CustomerView from "../pages/customers/CustomerView.jsx";
import CustomerEdit from "../pages/customers/CustomerEdit.jsx";
import Products from "../pages/products/Products.jsx";
import ProductView from "../pages/products/ProductView.jsx";
import UserView from "../pages/users/UserView.jsx";
import Settings from "../pages/settings/Settings.jsx";

// Dynamic import for Logs component using React.lazy()
import { lazy, Suspense } from "react";
import FestivalSchedule from "../pages/festival/Festival.jsx";
import LandingPage from "../pages/landingpage/LandingPage.jsx";

// Lazy load the Logs component to avoid build issues
const LogsPage = lazy(() => import("../pages/logs/Logs.jsx"));

// Loading fallback component
const LogsLoading = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading logs...</span>
  </div>
);

// Wrapper component with Suspense
const LogsPageWrapper = () => (
  <Suspense fallback={<LogsLoading />}>
    <LogsPage />
  </Suspense>
);

/**
 * Main app routing component
 * Handles all application routes and authentication state rehydration
 */
const AppRoutes = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  // Trigger RTK Query to fetch the current user when authenticated
  const { data: currentUserData } = useCurrentUser();

  // Rehydrate auth state on app start
  useEffect(() => {
    dispatch(rehydrateAuth());
  }, [dispatch]);

  // When the current user query returns, update the auth slice with the fresh user
  React.useEffect(() => {
    if (currentUserData && currentUserData.user) {
      dispatch(
        updateUser({
          user: currentUserData.user,
          shopId: currentUserData.shopId,
        }),
      );
    }
  }, [currentUserData, dispatch]);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path={ROUTES.HOME}
        element={<LandingPage/>}
      />
      <Route
        path={ROUTES.LOGIN}
        element={
          isAuthenticated ? (
            <Navigate to={ROUTES.DASHBOARD} replace />
          ) : (
            <Login />
          )
        }
      />

      <Route
        path={ROUTES.SIGNUP}
        element={
          isAuthenticated ? (
            <Navigate to={ROUTES.DASHBOARD} replace />
          ) : (
            <Signup />
          )
        }
      />

      {/* Protected routes */}
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.USERS}
        element={
          <PrivateRoute>
            <Users />
          </PrivateRoute>
        }
      />
      <Route
        path={`${ROUTES.USERS}/:id`}
        element={
          <PrivateRoute>
            <UserView />
          </PrivateRoute>
        }
      />
      <Route
        path={`${ROUTES.INVOICES}/new`}
        element={
          <PrivateRoute>
            <InvoiceGeneration />
          </PrivateRoute>
        }
      />
      <Route
        path={`${ROUTES.INVOICES}/:id/edit`}
        element={
          <PrivateRoute>
            <InvoiceEdit />
          </PrivateRoute>
        }
      />
      <Route
        path={`${ROUTES.INVOICES}/:id`}
        element={
          <PrivateRoute>
            <InvoiceView />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.INVOICES}
        element={
          <PrivateRoute>
            <InvoiceList />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.PRODUCTS}
        element={
          <PrivateRoute>
            <Products />
          </PrivateRoute>
        }
      />
      <Route
        path={`${ROUTES.PRODUCTS}/:id`}
        element={
          <PrivateRoute>
            <ProductView />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.CUSTOMERS}
        element={
          <PrivateRoute>
            <Customers />
          </PrivateRoute>
        }
      />
      <Route
        path={`${ROUTES.CUSTOMERS}/:id/edit`}
        element={
          <PrivateRoute>
            <CustomerEdit />
          </PrivateRoute>
        }
      />
      <Route
        path={`${ROUTES.CUSTOMERS}/:id`}
        element={
          <PrivateRoute>
            <CustomerView />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.LOGS}
        element={
          <PrivateRoute>
            <LogsPageWrapper />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.FESTIVAL_SCHEDULE}
        element={
          <PrivateRoute>
            <FestivalSchedule />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.SETTINGS}
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
      {/* Default redirect */}
      <Route
        path={ROUTES.HOME}
        element={
          <Navigate
            to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN}
            replace
          />
        }
      />

      {/* Catch all route - redirect to home */}
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
};

export default AppRoutes;
