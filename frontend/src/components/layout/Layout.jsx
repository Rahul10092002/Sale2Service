import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TopNav from "./TopNav.jsx";
import Sidebar from "./Sidebar.jsx";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const touchStart = useRef(null);

  // close sidebar overlay on large screens if toggled accidentally
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onToggleSidebar = () => setSidebarOpen((s) => !s);
  const onCloseSidebar = () => setSidebarOpen(false);
  const onToggleCollapse = () => setCollapsed((c) => !c);

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
    <div className="h-screen flex bg-gray-50 text-gray-900 transition-colors duration-300">
      {/* Left: fixed full-height sidebar (desktop) */}
      <div
        className={`hidden lg:block ${collapsed ? "w-20" : "w-64"} h-screen sticky top-0 overflow-auto transition-all duration-200  no-scrollbar`}
      >
        <Sidebar
          isOpen={true}
          onClose={onCloseSidebar}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </div>

      {/* Mobile / overlay Sidebar (keeps existing mobile behavior) */}
      <div className="lg:hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={onCloseSidebar}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </div>

      {/* Right: top nav (sticky) + main area (scrollable) */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-x-hidden">
        <div className="sticky top-0 z-20 bg-transparent">
          <TopNav
            onToggleSidebar={onToggleSidebar}
            onToggleCollapse={onToggleCollapse}
            isCollapsed={collapsed}
            title={title}
          />
        </div>

        {/* Global toast container */}
        <ToastContainer />

        <main
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`flex-1 overflow-auto transition-all duration-300 ease-in-out bg-gray-50 text-gray-900`}
        >
          <div className="max-w-7xl mx-auto bg-gray-50">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
