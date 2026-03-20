import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";

const TopNav = ({
  onToggleSidebar,
  onToggleCollapse,
  isCollapsed,
  title = "Dashboard",
}) => {
  const { user, role, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-white shadow sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center">
            <button
              aria-label="Open sidebar"
              onClick={onToggleSidebar}
              className="xl:hidden p-3 -ml-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="ml-3 text-lg font-semibold text-gray-900">
              <span className=" sm:inline">{title}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex sm:items-center sm:space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user?.ownerName || user?.name || "Owner"}
                </div>
                <div className="text-xs text-gray-500">
                  {role || user?.role || "Owner"}
                </div>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setOpen((s) => !s)}
                className="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 focus:outline-none"
                style={{ minWidth: 44, minHeight: 44 }}
                aria-haspopup="true"
                aria-expanded={open}
              >
                <img
                  src={
                    (user && user.avatar) ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.ownerName || user?.name || "O")}&background=7c3aed&color=fff`
                  }
                  alt="avatar"
                  className="w-8 h-8 rounded-full"
                />
              </button>

              {open && (
                <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Settings
                  </button>
                  <button
                    onClick={() => logout && logout(true)}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
