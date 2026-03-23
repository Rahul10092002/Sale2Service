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

// Inline Logs component to avoid import issues
const LogsPage = () => (
  <div className="container mx-auto px-4 py-8">
    <header className="mb-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">System Logs</h1>
      <p className="text-gray-600">View system activity and message logs</p>
    </header>
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Activity Logs</h2>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Refresh
        </button>
      </div>
      <div className="text-center py-12 text-gray-500">
        <div className="mb-4">
          <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center text-3xl">
            📋
          </div>
        </div>
        <p className="text-lg font-medium">Logs Feature Temporarily Disabled</p>
        <p className="text-sm">
          This feature will be restored after build optimization.
        </p>
      </div>
    </div>
  </div>
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
            <LogsPage />
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
