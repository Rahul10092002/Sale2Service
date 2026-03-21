import React, { useEffect, useState } from "react";
import TopNav from "./TopNav.jsx";
import Sidebar from "./Sidebar.jsx";
import ToastContainer from "../ui/ToastContainer.jsx";

const Layout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
      <div className="flex-1 flex flex-col h-screen">
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
          className={`flex-1 overflow-auto transition-all duration-300 ease-in-out bg-gray-50 text-gray-900`}
        >
          <div className="max-w-7xl mx-auto bg-gray-50">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
