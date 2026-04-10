import React from "react";
import {
  Home,
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
  Receipt,
  Box,
  Wrench,
  Activity,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../utils/constants.js";

const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <Home className="w-5 h-5" />,
    path: ROUTES.DASHBOARD,
  },
  {
    key: "invoices",
    label: "Invoices",
    icon: <Receipt className="w-5 h-5" />,
    path: ROUTES.INVOICES,
  },
  {
    key: "products",
    label: "Products",
    icon: <Box className="w-5 h-5" />,
    path: ROUTES.PRODUCTS,
  },
  {
    key: "customers",
    label: "Customers",
    icon: <User className="w-5 h-5" />,
    path: ROUTES.CUSTOMERS,
  },
  {
    key: "users",
    label: "Users",
    icon: <User className="w-5 h-5" />,
    path: ROUTES.USERS,
  },
  {
    key: "logs",
    label: "Logs",
    icon: <Activity className="w-5 h-5" />,
    path: ROUTES.LOGS,
  },
  {
    key: "Schedules",
    label: "Schedules",
    icon: <Wrench className="w-5 h-5" />,
    path: ROUTES.FESTIVAL_SCHEDULE,
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings className="w-5 h-5" />,
    path: ROUTES.SETTINGS,
  },
];

const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Backdrop for mobile drawer */}
      <div
        className={`fixed inset-0 z-30 transition-opacity lg:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"} no-scrollbar`}
        style={{ background: "rgba(15, 23, 42, 0.7)" }}
        onClick={onClose}
      />

      <aside
        className={`fixed z-40 top-0 left-0 h-screen bg-white dark:bg-dark-input shadow-xl transform transition-all duration-300 lg:static lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "w-20" : "w-48"} border-r border-gray-200 dark:border-dark-border flex flex-col no-scrollbar`}
        style={{ minWidth: collapsed ? 80 : 192 }}
      >
        {/* Header with logo */}
        <div className="h-16 flex items-center bg-white dark:bg-dark-input border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-2 w-full px-1">
  {/* Icon (simple modern replacement) */}
  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-green-500 text-white font-bold">
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5 text-white"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3l7 4v5c0 5-3.5 9-7 9s-7-4-7-9V7l7-4z" />
  </svg>
</div>
  </div>

  {/* Text Logo */}
  {!collapsed && (
    <h1 className="text-md font-bold tracking-tight">
     <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
  Warranty
</span>
      <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
        Desk
      </span>
    </h1>
  )}
</div>

          <div className="ml-auto hidden lg:block">
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-600 dark:text-slate-400 transition-colors duration-200"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              onClick={() => {
                // Close mobile sidebar when navigating
                if (window.innerWidth < 1024) {
                  onClose();
                }
              }}
              className={`flex items-center gap-3 rounded-lg p-3 transition-all duration-200 group ${
                isActive(item.path)
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500 shadow-sm"
                  : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-slate-100"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <span
                className={`shrink-0 ${isActive(item.path) ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"}`}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {item.label}
                </span>
              )}

              {/* Active indicator dot for collapsed state */}
              {collapsed && isActive(item.path) && (
                <div className="absolute right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-dark-subtle">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600 dark:text-slate-400 font-medium">
                WarrantyDesk Pro
              </span>
            </div>
          )}
          {collapsed && (
            <div className="flex flex-col item-center space-y-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
