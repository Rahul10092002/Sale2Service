import React from "react";
import {
  Home,
  Settings,
  User,
  Receipt,
  Box,
  Wrench,
  Activity,
  Table
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../utils/constants.js";
import { usePermissions } from "../../hooks/usePermissions.js";

const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <Home className="w-4 h-4" />,
    path: ROUTES.DASHBOARD,
    permission: "dashboard_view",
  },
  {
    key: "New-Invoice",
    label: "Create Invoice",
    icon: <Receipt className="w-4 h-4" />,
    path: ROUTES.NEW_INVOICE,
    permission: "invoices_create",
  },
  {
    key: "invoices",
    label: "Invoices",
    icon: <Receipt className="w-4 h-4" />,
    path: ROUTES.INVOICES,
    permission: "invoices_view",
  },
  {
    key: "products",
    label: "Products",
    icon: <Box className="w-4 h-4" />,
    path: ROUTES.PRODUCTS,
    permission: "products_view",
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: <Table className="w-4 h-4" />,
    path: ROUTES.INVENTORY,
    permission: "inventory_view",
  },
  {
    key: "customers",
    label: "Customers",
    icon: <User className="w-4 h-4" />,
    path: ROUTES.CUSTOMERS,
    permission: "customers_view",
  },
  {
    key: "users",
    label: "Users",
    icon: <User className="w-4 h-4" />,
    path: ROUTES.USERS,
    permission: "users_view",
  },
  {
    key: "logs",
    label: "Logs",
    icon: <Activity className="w-4 h-4" />,
    path: ROUTES.LOGS,
    permission: "logs_view",
  },
  {
    key: "Schedules",
    label: "Schedules",
    icon: <Wrench className="w-4 h-4" />,
    path: ROUTES.FESTIVAL_SCHEDULE,
    permission: "schedules_view",
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings className="w-4 h-4" />,
    path: ROUTES.SETTINGS,
    permission: "settings_view",
  },
];

const Sidebar = () => {
  const location = useLocation();
  const { hasPermission } = usePermissions();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <aside
      className="h-screen bg-white dark:bg-dark-input border-r border-gray-200 dark:border-dark-border flex flex-col w-[220px] transition-all duration-300"
    >
      {/* Header with logo */}
      <div className="h-16 flex items-center px-4 bg-white dark:bg-dark-input border-b border-gray-200 dark:border-dark-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 3l7 4v5c0 5-3.5 9-7 9s-7-4-7-9V7l7-4z"
              />
            </svg>
          </div>
          <h1 className="text-sm font-bold tracking-tight">
            <span className="text-slate-900 dark:text-slate-100">Warranty</span>
            <span className="text-blue-600">Desk</span>
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems
          .filter(item => hasPermission(item.permission))
          .map((item) => (
          <Link
            key={item.key}
            to={item.path}
            className={`flex items-center gap-2.5 rounded-lg p-2 transition-all duration-200 group ${
              isActive(item.path)
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 border-r-2 border-blue-500 dark:text-blue-300 shadow-sm"
                : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-dark-hover hover:text-blue-600 dark:hover:text-slate-100"
            }`}
          >
            <span
              className={`shrink-0 ${isActive(item.path) ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400"}`}
            >
              {item.icon}
            </span>
            <span className="text-[11px] font-semibold">
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 dark:border-dark-border bg-gray-50/30 dark:bg-dark-subtle/20">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] text-gray-500 dark:text-slate-500 font-bold uppercase tracking-wider">
            Enterprise Edition
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
