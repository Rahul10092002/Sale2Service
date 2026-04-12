import React, { useState } from "react";
import { Home, Receipt, Box, User, MoreHorizontal, Settings, Activity, Users, PlusCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../utils/constants.js";

const items = [
  { icon: <Home size={18} />, label: "Home", path: ROUTES.DASHBOARD },
  { icon: <PlusCircle size={18} />, label: "New Invoice", path: ROUTES.NEW_INVOICE },
  { icon: <Receipt size={18} />, label: "Invoices", path: ROUTES.INVOICES },
  { icon: <Box size={18} />, label: "Products", path: ROUTES.PRODUCTS },
  { icon: <User size={18} />, label: "Customers", path: ROUTES.CUSTOMERS },
];

export default function MobileBottomNav() {
  const [showDrawer, setShowDrawer] = useState(false);
  const location = useLocation();

  const secondaryItems = [
    { icon: <Users size={18} />, label: "Manage Users", path: ROUTES.USERS },
    { icon: <Activity size={18} />, label: "Logs", path: ROUTES.LOGS },
    { icon: <Settings size={18} />, label: "Settings", path: ROUTES.SETTINGS },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-dark-input/80 backdrop-blur-md border-t border-gray-200 dark:border-dark-border flex justify-around items-center py-2 pb-safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {items.map((item, i) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={i}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-all duration-200 ${
                active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${active ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-semibold tracking-tight transition-all ${active ? "opacity-100" : "opacity-80"}`}>
                {item.label}
              </span>
              {active && <div className="h-0.5 w-4 rounded-full bg-blue-500 dark:bg-blue-400 -mt-0.5 animate-in fade-in zoom-in duration-300" />}
            </Link>
          );
        })}
        
        <button
          onClick={() => setShowDrawer(true)}
          className={`flex flex-col items-center gap-1 py-1 px-3 transition-all duration-200 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200`}
        >
          <div className="p-1 rounded-lg">
            <MoreHorizontal size={18} />
          </div>
          <span className="text-[10px] font-semibold tracking-tight opacity-80">More</span>
        </button>
      </div>

      {/* Mobile Drawer (Smart Overlay) */}
      {showDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] transition-opacity animate-in fade-in duration-300"
            onClick={() => setShowDrawer(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-input rounded-t-[2.5rem] p-6 pb-12 z-[70] space-y-6 shadow-2xl animate-in slide-in-from-bottom duration-300 border-t border-gray-100 dark:border-dark-border">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-dark-border rounded-full mx-auto mb-2 opacity-50" />
            
            <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 italic">Quick Access</h3>
              <button 
                onClick={() => setShowDrawer(false)}
                className="text-sm font-medium text-blue-600 dark:text-blue-400"
              >
                Done
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {secondaryItems.map((item, i) => (
                <Link
                  key={i}
                  to={item.path}
                  onClick={() => setShowDrawer(false)}
                  className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-dark-hover/50 hover:bg-gray-100 dark:hover:bg-dark-hover transition-all border border-transparent hover:border-gray-200 dark:hover:border-dark-border group"
                >
                  <div className="p-2.5 rounded-xl bg-white dark:bg-dark-input shadow-sm group-hover:scale-110 transition-transform">
                    <span className="text-blue-600 dark:text-blue-400">{item.icon}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-slate-200">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
