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
        className={`fixed z-40 top-0 left-0 h-screen bg-white shadow-xl transform transition-all duration-300 lg:static lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "w-20" : "w-64"} border-r border-gray-200 flex flex-col no-scrollbar`}
        style={{ minWidth: collapsed ? 80 : 256 }}
      >
        {/* Header with logo */}
        <div className="h-16 flex items-center bg-white border-b border-gray-200">
          <div className="flex items-center space-x-2 w-full">
            <img
              src={collapsed ? "/logo_without_text.png" : "/Logo_warranty.png"}
              alt="WarrantyDesk Logo"
              className={`${collapsed ? " ml-2 w-10 h-10" : "w-full h-8 max-w-48"} object-contain`}
            />
          </div>

          <div className="ml-auto hidden lg:block">
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-200"
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
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-500 shadow-sm"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <span
                className={`shrink-0 ${isActive(item.path) ? "text-blue-600" : "text-gray-500 group-hover:text-blue-600"}`}
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
        <div className="p-4 border-t border-gray-200 bg-gray-50/50">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600 font-medium">
                WarrantyDesk Pro
              </span>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
