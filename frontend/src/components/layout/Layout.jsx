import React from "react";
import TopNav from "./TopNav.jsx";
import Sidebar from "./Sidebar.jsx";
import MobileBottomNav from "./MobileBottomNav.jsx";
import ToastContainer from "../ui/ToastContainer.jsx";

const Layout = ({ children, title }) => {
  return (
    <div className="h-screen flex bg-gray-50 dark:bg-dark-bg text-ink-base dark:text-slate-100 transition-colors duration-200">
      {/* Left: fixed full-height sidebar (desktop) */}
      <div className="hidden lg:block h-screen sticky top-0 overflow-auto no-scrollbar border-r border-gray-200 dark:border-dark-border">
        <Sidebar />
      </div>

      {/* Mobile Bottom Navigation (Mobile-first ultra compact vision) */}
      <div className="lg:hidden">
        <MobileBottomNav />
      </div>

      {/* Right: top nav (sticky) + main area (scrollable) */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <div className="sticky top-0 z-40 bg-white dark:bg-dark-input safe-top">
          <TopNav title={title} />
        </div>

        {/* Global toast container */}
        <ToastContainer />

        <main
          className={`flex-1 overflow-auto pb-[80px] lg:pb-0 transition-all duration-200 ease-in-out bg-gray-50 dark:bg-dark-bg text-ink-base dark:text-slate-100`}
        >
          <div className="max-w-7xl mx-auto bg-gray-50 dark:bg-dark-bg">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
