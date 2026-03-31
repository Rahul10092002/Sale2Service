import React, { useState } from "react";
import { Menu, User, Settings, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";

const TopNav = ({
  onToggleSidebar,
  title = "Dashboard",
}) => {
  const { user, role, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="h-16 w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex h-full items-center justify-between">
          {/* Left section */}
          <div className="flex items-center">
            <button
              aria-label="Open sidebar"
              onClick={onToggleSidebar}
              className="xl:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="ml-3">
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
              <div className="text-xs text-gray-500 mt-0.5">
                WarrantyDesk Professional
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            {/* <button

            {/* User info - hidden on mobile */}
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

            {/* User avatar dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpen((s) => !s)}
                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                aria-haspopup="true"
                aria-expanded={open}
              >
                <div className="relative">
                  <img
                    src={
                      (user && user.avatar) ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.ownerName || user?.name || "O")}&background=2563eb&color=fff&bold=true`
                    }
                    alt="User avatar"
                    className="w-8 h-8 rounded-lg border-2 border-gray-200 shadow-sm"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
              </button>

              {/* Dropdown menu */}
              {open && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpen(false)}
                  />

                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="text-sm font-medium text-gray-900">
                        {user?.ownerName || user?.name || "Owner"}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user?.email ||
                          user?.email_address ||
                          user?.emailAddress ||
                          user?.owner_email ||
                          user?.contact_email ||
                          user?.phone ||
                          user?.mobile ||
                          user?.username ||
                          "admin@warrantydesk.com"}
                      </div>
                    </div>

                    <button className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150">
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </button>

                    <button
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      onClick={() => {
                        window.location.href = "/settings";
                      }}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </button>

                    <div className="border-t border-gray-200 my-1"></div>

                    <button
                      onClick={() => {
                        logout && logout(true);
                        setOpen(false);
                      }}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
