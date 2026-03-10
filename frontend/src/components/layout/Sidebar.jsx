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
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../utils/constants.js";

const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <Home className="w-5 h-5 text-indigo-600" />,
    path: ROUTES.DASHBOARD,
  },
  {
    key: "invoices",
    label: "Invoices",
    icon: <Receipt className="w-5 h-5 text-indigo-600" />,
    path: ROUTES.INVOICES,
  },
  {
    key: "products",
    label: "Products",
    icon: <Box className="w-5 h-5 text-indigo-600" />,
    path: ROUTES.PRODUCTS,
  },
  {
    key: "customers",
    label: "Customers",
    icon: <User className="w-5 h-5 text-indigo-600" />,
    path: ROUTES.CUSTOMERS,
  },
  {
    key: "users",
    label: "Users",
    icon: <User className="w-5 h-5 text-indigo-600" />,
    path: ROUTES.USERS,
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings className="w-5 h-5 text-indigo-600" />,
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
        className={`fixed inset-0 bg-opacity-30 backdrop-blur-md bg-opacity-40 z-30 transition-opacity lg:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}  no-scrollbar`}
        onClick={onClose}
      />

      <aside
        className={`fixed z-40 top-0 left-0 h-screen bg-white shadow-lg transform transition-transform lg:static lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "w-20" : "w-64"} border-r border-gray-200 flex flex-col no-scrollbar`}
        style={{ minWidth: collapsed ? 80 : 256 }}
      >
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold">
              S
            </div>
            {!collapsed && <div className="font-semibold">Sale2Service</div>}
          </div>

          <div className="ml-auto hidden lg:block">
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              {collapsed ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <nav className="p-2 mt-2">
          {navItems.map((it) => (
            <Link
              key={it.key}
              to={it.path}
              onClick={() => {
                // Close mobile sidebar when navigating
                if (window.innerWidth < 1024) {
                  onClose();
                }
              }}
              className={`flex items-center gap-3 rounded-md p-3 transition-colors ${
                isActive(it.path)
                  ? "bg-indigo-50 text-indigo-700 border-r-2 border-indigo-500"
                  : "text-gray-700 hover:bg-gray-50"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <span className="shrink-0">{it.icon}</span>
              {!collapsed && (
                <span className="text-sm font-medium">{it.label}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-gray-100">
          {!collapsed && (
            <div className="text-xs text-gray-500">Role: Owner</div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
