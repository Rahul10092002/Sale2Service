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
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../utils/constants.js";
import { usePermissions } from "../../hooks/usePermissions.js";

// Primary tabs displayed on the mobile bottom bar (6 main routes + 1 More drawer = 7 slots)
const primaryItems = [
  {
    icon: Home,
    label: "Home",
    path: ROUTES.DASHBOARD,
    permission: "dashboard_view",
    isExact: true,
  },
  {
    icon: Receipt,
    label: "Invoices",
    path: ROUTES.INVOICES,
    permission: "invoices_view",
    matchPrefix: "/invoices",
  },
  {
    icon: PlusCircle,
    label: "Create",
    path: ROUTES.NEW_INVOICE,
    permission: "invoices_create",
    isExact: true,
  },
  {
    icon: Box,
    label: "Products",
    path: ROUTES.PRODUCTS,
    permission: "products_view",
    matchPrefix: "/products",
  },
  {
    icon: User,
    label: "Customers",
    path: ROUTES.CUSTOMERS,
    permission: "customers_view",
    matchPrefix: "/customers",
  },
  {
    icon: Table,
    label: "Purchases",
    path: ROUTES.INVENTORY,
    permission: "inventory_view",
    matchPrefix: "/inventory",
  },
];

export default function MobileBottomNav() {
  const [showDrawer, setShowDrawer] = useState(false);
  const location = useLocation();
  const { hasPermission } = usePermissions();

  const filteredItems = primaryItems.filter((item) => hasPermission(item.permission));

  const secondaryItems = [
    { icon: ShieldCheck, label: "Warranty", path: ROUTES.WARRANTY, permission: "inventory_view" },
    { icon: Users, label: "Users", path: ROUTES.USERS, permission: "users_view" },
    { icon: Wrench, label: "Schedules", path: ROUTES.FESTIVAL_SCHEDULE, permission: "schedules_view" },
    { icon: Activity, label: "Audit Logs", path: ROUTES.LOGS, permission: "logs_view" },
    { icon: Settings, label: "Settings", path: ROUTES.SETTINGS, permission: "settings_view" },
  ].filter((item) => hasPermission(item.permission));

  // Determine if a secondary drawer item is currently active
  const isMoreActive = secondaryItems.some((item) =>
    location.pathname === item.path ||
    (item.path !== ROUTES.DASHBOARD && location.pathname.startsWith(item.path))
  );

  return (
    <aside className="lg:hidden">
      {/* PWA Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] px-1 pt-1 pb-[calc(0.35rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between"
      >
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isExact
            ? location.pathname === item.path
            : location.pathname === item.path ||
              (item.matchPrefix && location.pathname.startsWith(item.matchPrefix));

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] min-w-0 select-none group active:scale-95 transition-transform duration-150"
            >
              <div
                className={`relative flex items-center justify-center w-9 sm:w-10 h-6.5 sm:h-7 rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </div>
              <span
                className={`text-[9px] sm:text-[10px] leading-tight mt-0.5 tracking-tight text-center truncate max-w-full px-0.5 transition-colors duration-150 ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-500 dark:text-slate-400 font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More Button to trigger secondary actions drawer */}
        {secondaryItems.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDrawer(true)}
            aria-label="More options"
            className="flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] min-w-0 select-none group active:scale-95 transition-transform duration-150"
          >
            <div
              className={`relative flex items-center justify-center w-9 sm:w-10 h-6.5 sm:h-7 rounded-full transition-all duration-200 ${
                isMoreActive
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              }`}
            >
              <MoreHorizontal size={18} strokeWidth={isMoreActive ? 2.4 : 1.8} />
              {isMoreActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </div>
            <span
              className={`text-[9px] sm:text-[10px] leading-tight mt-0.5 tracking-tight text-center truncate max-w-full px-0.5 transition-colors duration-150 ${
                isMoreActive
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 font-medium"
              }`}
            >
              More
            </span>
          </button>
        )}
      </nav>

      {/* PWA Smart Drawer Overlay */}
      {showDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] animate-in fade-in duration-200"
            onClick={() => setShowDrawer(false)}
          />

          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-slate-900 rounded-t-3xl px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl animate-in slide-in-from-bottom duration-250 border-t border-slate-200 dark:border-slate-800">
            {/* Grab Bar */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />

            {/* Header */}
            <div className="flex justify-between items-center mb-4 px-1">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  More Actions & Modules
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Quick access to all workspace features
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full bg-slate-100 dark:bg-slate-800 active:scale-95 transition-transform"
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Secondary Actions Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                  (item.path !== ROUTES.DASHBOARD && location.pathname.startsWith(item.path));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowDrawer(false)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all active:scale-95 text-center ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800"
                        : "bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <span
                      className={`text-[11px] leading-tight line-clamp-2 ${
                        isActive
                          ? "font-bold text-blue-600 dark:text-blue-400"
                          : "font-medium text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
