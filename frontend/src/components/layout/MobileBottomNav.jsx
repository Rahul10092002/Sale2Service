import React, { useState } from "react";
import { Home, Receipt, Box, User, MoreHorizontal, Settings, Activity, Users, PlusCircle, Table, Wrench } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../utils/constants.js";
import { usePermissions } from "../../hooks/usePermissions.js";

const items = [
  { icon: <Home size={18} />, label: "Home", path: ROUTES.DASHBOARD, permission: "dashboard_view" },
  { icon: <PlusCircle size={18} />, label: "New Invoice", path: ROUTES.NEW_INVOICE, permission: "invoices_create" },
  { icon: <Receipt size={18} />, label: "Invoices", path: ROUTES.INVOICES, permission: "invoices_view" },
  { icon: <Box size={18} />, label: "Products", path: ROUTES.PRODUCTS, permission: "products_view" },
  { icon: <User size={18} />, label: "Customers", path: ROUTES.CUSTOMERS, permission: "customers_view" },
];

export default function MobileBottomNav() {
  const [showDrawer, setShowDrawer] = useState(false);
  const location = useLocation();
  const { hasPermission } = usePermissions();

  const filteredItems = items.filter(item => hasPermission(item.permission));

  const secondaryItems = [
    { icon: <Table size={18} />, label: "Inventory", path: ROUTES.INVENTORY, permission: "inventory_view" },
    { icon: <Users size={18} />, label: "Manage Users", path: ROUTES.USERS, permission: "users_view" },
    { icon: <Wrench size={18} />, label: "Schedules", path: ROUTES.FESTIVAL_SCHEDULE, permission: "schedules_view" },
    { icon: <Activity size={18} />, label: "Logs", path: ROUTES.LOGS, permission: "logs_view" },
    { icon: <Settings size={18} />, label: "Settings", path: ROUTES.SETTINGS, permission: "settings_view" },
  ].filter(item => hasPermission(item.permission));

  return (
    <aside className="lg:hidden">
     <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-dark-input/90 backdrop-blur-xl border-t border-gray-200 dark:border-dark-border flex justify-between items-center px-6 py-2 pb-safe-bottom">
        {filteredItems.map((item, i) => {
          const active = location.pathname === item.path;
          return (
           <Link
  key={i}
  to={item.path}
  className="flex flex-col items-center justify-center gap-1 flex-1"
>
  <div className={`relative p-2 rounded-xl transition-all ${
    active
      ? "text-blue-600 dark:text-blue-400"
      : "text-gray-400"
  }`}>
    
    {item.icon}

    {active && (
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
    )}
  </div>

  <span className={`text-[10px] font-medium ${
    active ? "text-blue-600" : "text-gray-400"
  }`}>
    {item.label}
  </span>
</Link>
          );
        })}
        
        {secondaryItems.length > 0 && (
          <button
            onClick={() => setShowDrawer(true)}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-all duration-200 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200`}
          >
            <div className="p-1 rounded-lg">
              <MoreHorizontal size={18} />
            </div>
            <span className="text-[10px] font-semibold tracking-tight opacity-80">More</span>
          </button>
        )}
      </div>

      {/* Mobile Drawer (Smart Overlay) */}
      {showDrawer && (
     <>
  {/* Overlay */}
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-[3px] z-[60] animate-in fade-in duration-300"
    onClick={() => setShowDrawer(false)}
  />

  {/* Drawer */}
  <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-dark-input rounded-t-[2.5rem] px-5 pt-4 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300 border-t border-gray-100 dark:border-dark-border">

    {/* Handle */}
    <div className="w-12 h-1.5 bg-gray-300 dark:bg-dark-border rounded-full mx-auto mb-3 opacity-60" />

    {/* Header */}
    <div className="flex justify-between items-center mb-4 px-1">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
        More Actions
      </h3>
      <button
        onClick={() => setShowDrawer(false)}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 active:scale-95"
      >
        Close
      </button>
    </div>

    {/* 🔥 TOP: QUICK GRID (MOST USED) */}
    <div className="grid grid-cols-5 gap-3">
      {secondaryItems.slice(0, 5).map((item, i) => (
        <Link
          key={i}
          to={item.path}
          onClick={() => setShowDrawer(false)}
          className="flex flex-col items-center gap-2 p-2 rounded-xl active:scale-95 transition"
        >
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm">
            {item.icon}
          </div>
          <span className="text-[10px] font-medium text-gray-600 dark:text-slate-300 text-center leading-tight">
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
