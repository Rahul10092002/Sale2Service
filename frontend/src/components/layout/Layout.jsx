import React, { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TopNav from "./TopNav.jsx";
import Sidebar from "./Sidebar.jsx";
import MobileBottomNav from "./MobileBottomNav.jsx";
import ToastContainer from "../ui/ToastContainer.jsx";
import { ROUTES } from "../../utils/constants.js";

// Ordered list of pages that can be cycled through with swipe gestures on mobile
const NAV_PAGES = [
  ROUTES.DASHBOARD,
  ROUTES.INVOICES,
  ROUTES.PRODUCTS,
  ROUTES.CUSTOMERS,
  ROUTES.USERS,
  ROUTES.LOGS,
  ROUTES.FESTIVAL_SCHEDULE,
  ROUTES.SETTINGS,
];

const SWIPE_THRESHOLD = 60; // minimum horizontal px to trigger navigation
const SWIPE_ANGLE_LIMIT = 35; // max angle (deg) from horizontal to count as a swipe

const Layout = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStart = useRef(null);

  const handleTouchStart = (e) => {
    if (window.innerWidth >= 1024) return; // desktop — no swipe nav
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStart.current || window.innerWidth >= 1024) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD) return; // too short
    const angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
    if (angle > SWIPE_ANGLE_LIMIT && angle < 180 - SWIPE_ANGLE_LIMIT) return; // too vertical

    const currentIndex = NAV_PAGES.findIndex((p) => location.pathname === p);
    if (currentIndex === -1) return; // not a top-level sidebar page — skip on detail/other pages

    if (dx < 0) {
      // swipe left → next page
      if (currentIndex < NAV_PAGES.length - 1) {
        navigate(NAV_PAGES[currentIndex + 1]);
      }
    } else {
      // swipe right → previous page
      if (currentIndex > 0) {
        navigate(NAV_PAGES[currentIndex - 1]);
      }
    }
  };

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
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
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
