import React, { useState } from "react";
import {
  Home,
  Receipt,
  Box,
  User,
  MoreHorizontal,
  Settings,
  Activity,
  Users,
  PlusCircle,
  Table,
  Wrench,
  PackageCheck,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../utils/constants.js";
import { usePermissions } from "../../hooks/usePermissions.js";

const primaryItems = [
  { icon: <Home size={20} />, label: "Home", path: ROUTES.DASHBOARD, permission: "dashboard_view" },
  { icon: <Table size={20} />, label: "Inventory", path: ROUTES.INVENTORY, permission: "inventory_view" },
  {
    icon: <PlusCircle size={22} className="text-white" />,
    label: "Invoice",
    path: ROUTES.NEW_INVOICE,
    permission: "invoices_create",
    isPrimaryFab: true,
  },
  { icon: <Receipt size={20} />, label: "Invoices", path: ROUTES.INVOICES, permission: "invoices_view" },
  { icon: <Box size={20} />, label: "Products", path: ROUTES.PRODUCTS, permission: "products_view" },
];

export default function MobileBottomNav() {
  const [showDrawer, setShowDrawer] = useState(false);
  const location = useLocation();
  const { hasPermission } = usePermissions();

  const filteredItems = primaryItems.filter((item) => hasPermission(item.permission));

  const secondaryItems = [
    { icon: <User size={20} />, label: "Customers", path: ROUTES.CUSTOMERS, permission: "customers_view" },
    { icon: <Users size={20} />, label: "Manage Users", path: ROUTES.USERS, permission: "users_view" },
    { icon: <Wrench size={20} />, label: "Schedules", path: ROUTES.FESTIVAL_SCHEDULE, permission: "schedules_view" },
    { icon: <Activity size={20} />, label: "Audit Logs", path: ROUTES.LOGS, permission: "logs_view" },
    { icon: <Settings size={20} />, label: "Settings", path: ROUTES.SETTINGS, permission: "settings_view" },
  ].filter((item) => hasPermission(item.permission));

  return (
    <aside className="lg:hidden">
      {/* PWA Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800 flex justify-around items-center px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-lg">
        {filteredItems.map((item, i) => {
          const active = location.pathname === item.path;

          if (item.isPrimaryFab) {
            return (
              <Link
                key={i}
                to={item.path}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-active:scale-95 transition-transform border-2 border-white dark:border-gray-900">
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={i}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] active:scale-95 transition-transform"
            >
              <div
                className={`relative p-1.5 rounded-xl transition-all ${
                  active
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                {item.icon}
                {active && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                )}
              </div>
              <span
                className={`text-[10px] font-semibold tracking-tight ${
                  active
                    ? "text-indigo-600 dark:text-indigo-400 font-bold"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {secondaryItems.length > 0 && (
          <button
            onClick={() => setShowDrawer(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] active:scale-95 transition-transform text-gray-500 dark:text-gray-400"
          >
            <div className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
              <MoreHorizontal size={20} />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">More</span>
          </button>
        )}
      </div>

      {/* PWA Smart Drawer Overlay */}
      {showDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[60] animate-in fade-in duration-200"
            onClick={() => setShowDrawer(false)}
          />

          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl animate-in slide-in-from-bottom duration-250 border-t border-gray-200 dark:border-gray-800">
            {/* Grab Bar */}
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3" />

            {/* Header */}
            <div className="flex justify-between items-center mb-4 px-1">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  More App Tools & Settings
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Quick access to all workspace features
                </p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full bg-gray-100 dark:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Secondary Actions Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {secondaryItems.map((item, i) => (
                <Link
                  key={i}
                  to={item.path}
                  onClick={() => setShowDrawer(false)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-gray-100 dark:border-gray-800 active:scale-95 transition-all text-center"
                >
                  <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                    {item.icon}
                  </div>
                  <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 leading-tight">
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
