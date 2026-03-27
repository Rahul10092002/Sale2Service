import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../features/auth/authSlice.js";
import { ROUTES } from "../utils/constants.js";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import Layout from "../components/layout/Layout.jsx";

/**
 * PrivateRoute component that protects routes requiring authentication
 * Redirects unauthenticated users to login page
 * Automatically wraps authenticated pages with Layout
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {Array} props.allowedRoles - Array of roles allowed to access this route (optional)
 * @param {string} props.title - Page title to display in Layout (optional)
 */
const PrivateRoute = ({ children, allowedRoles = [], title }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();

  // Get page title from route if not provided
  const getPageTitle = () => {
    if (title) return title;

    const routeToTitle = {
      [ROUTES.DASHBOARD]: "Dashboard",
      [ROUTES.INVOICES]: "Invoices",
      [ROUTES.PRODUCTS]: "Products",
      [ROUTES.CUSTOMERS]: "Customers",
      [ROUTES.USERS]: "Users",
      [ROUTES.LOGS]: "Logs",
      [ROUTES.SETTINGS]: "Settings",
    };

    // Check for exact matches first
    if (routeToTitle[location.pathname]) {
      return routeToTitle[location.pathname];
    }

    // Check for partial matches for detail/edit pages
    for (const [route, pageTitle] of Object.entries(routeToTitle)) {
      if (location.pathname.startsWith(route)) {
        if (location.pathname.includes("/edit")) {
          return `Edit ${pageTitle.slice(0, -1)}`; // Remove 's' for singular
        } else if (location.pathname.includes("/new")) {
          return `Create ${pageTitle.slice(0, -1)}`;
        } else if (location.pathname !== route) {
          return `${pageTitle.slice(0, -1)} Details`; // Detail view
        }
        return pageTitle;
      }
    }

    return "Dashboard"; // Default fallback
  };

  // Show loading spinner while checking authentication
  // This prevents flash of login page during app initialization
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // TODO: Add role-based access control if needed
  // if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
  //   return (
  //     <Navigate
  //       to={ROUTES.UNAUTHORIZED}
  //       replace
  //     />
  //   )
  // }

  // Render children wrapped in Layout if authenticated
  return <Layout title={getPageTitle()}>{children}</Layout>;
};

export default PrivateRoute;
