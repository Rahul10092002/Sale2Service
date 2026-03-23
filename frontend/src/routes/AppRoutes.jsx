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
  const [searchTerm, setSearchTerm] = useState("");

  // RTK Query hooks for data fetching
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useGetReminderStatsQuery();

  const {
    data: logsData,
    isLoading: logsLoading,
    error,
    refetch: refetchLogs,
  } = useGetReminderLogsQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm,
  });

  const handleRefresh = () => {
    refetchStats();
    refetchLogs();
  };

  if (statsLoading || logsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600">
            Error loading logs: {error.message || "Unknown error"}
          </p>
          <Button onClick={handleRefresh} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">System Logs</h1>
        <p className="text-gray-600">View system activity and message logs</p>
      </header>

      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-blue-600">
              Total Messages
            </h3>
            <p className="text-2xl font-bold text-blue-700">
              {statsData.total || 0}
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-green-600">Successful</h3>
            <p className="text-2xl font-bold text-green-700">
              {statsData.successful || 0}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-red-600">Failed</h3>
            <p className="text-2xl font-bold text-red-700">
              {statsData.failed || 0}
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-yellow-600">Pending</h3>
            <p className="text-2xl font-bold text-yellow-700">
              {statsData.pending || 0}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Activity Logs</h2>
          <Button onClick={handleRefresh} variant="primary" size="sm">
            Refresh
          </Button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {logsData?.logs?.length > 0 ? (
          <div className="space-y-4">
            {logsData.logs.map((log) => (
              <div
                key={log._id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 font-medium">
                      {log.message || "No message"}
                    </p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Type: {log.entity_type || "Unknown"}</span>
                      <span>
                        Created:{" "}
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleDateString()
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-4 ${
                      log.message_status === "sent"
                        ? "bg-green-100 text-green-800"
                        : log.message_status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {log.message_status || "unknown"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="mb-4">
              <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center text-3xl">
                📋
              </div>
            </div>
            <p className="text-lg font-medium">No logs found</p>
            <p className="text-sm">
              Try adjusting your search or refresh the data.
            </p>
          </div>
        )}

        {logsData?.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              Showing page {currentPage} of {logsData.totalPages}
            </p>
            <div className="flex space-x-2">
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <Button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(prev + 1, logsData.totalPages),
                  )
                }
                disabled={currentPage === logsData.totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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
