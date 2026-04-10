import React, { useState } from "react";
import { Menu, User, Settings, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { useDarkMode } from "../../hooks/useDarkMode.js";

const TopNav = ({ onToggleSidebar, title = "Dashboard" }) => {
  const { user, role, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [open, setOpen] = useState(false);

  return (
    <div className="h-16 w-full bg-white dark:bg-dark-input border-b border-gray-200 dark:border-dark-border shadow-sm dark:shadow-glass-dark sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex h-full items-center justify-between">

          {/* ── Left: sidebar toggle + page title ─────────────────── */}
          <div className="flex items-center">
            <button
              aria-label="Open sidebar"
              onClick={onToggleSidebar}
              className="xl:hidden p-2 rounded-lg text-ink-secondary dark:text-slate-400 hover:bg-surface-hover dark:hover:bg-dark-hover focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors duration-200"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="ml-3">
              <h1 className="text-xl font-semibold text-ink-base dark:text-slate-100">
                {title}
              </h1>
              <div className="text-xs text-ink-muted dark:text-slate-500 mt-0.5">
                WarrantyDesk Professional
              </div>
            </div>
          </div>

          {/* ── Right: dark-mode toggle + user info + avatar ───────── */}
          <div className="flex items-center gap-3">

            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="relative p-2 rounded-lg text-ink-secondary dark:text-slate-400 hover:bg-surface-hover dark:hover:bg-dark-hover focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200 group"
            >
              {/* Sun icon — visible in dark mode */}
              <Sun
                className={`w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                  isDarkMode
                    ? "opacity-100 rotate-0 scale-100"
                    : "opacity-0 rotate-90 scale-50"
                }`}
              />
              {/* Moon icon — visible in light mode */}
              <Moon
                className={`w-5 h-5 transition-all duration-300 ${
                  isDarkMode
                    ? "opacity-0 -rotate-90 scale-50"
                    : "opacity-100 rotate-0 scale-100"
                }`}
              />
            </button>

            {/* User name + role — hidden on mobile */}
            <div className="hidden sm:flex sm:items-center sm:space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-ink-base dark:text-slate-100 capitalize">
                  {user?.ownerName || user?.name || "Owner"}
                </div>
                <div className="text-xs text-ink-muted dark:text-slate-500">
                  {role || user?.role || "Owner"}
                </div>
              </div>
            </div>

            {/* User avatar dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpen((s) => !s)}
                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-surface-hover dark:hover:bg-dark-hover focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                aria-haspopup="true"
                aria-expanded={open}
              >
                <div className="relative">
                  <img
                    src={
                      (user && user.avatar) ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user?.ownerName || user?.name || "O",
                      )}&background=2563eb&color=fff&bold=true`
                    }
                    alt="User avatar"
                    className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-dark-border shadow-sm"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-dark-input rounded-full" />
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

                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-dark-card rounded-lg shadow-dropdown dark:shadow-glass-dark border border-gray-200 dark:border-dark-border py-1 z-20 animate-fade-in">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                      <div className="text-sm font-medium text-ink-base dark:text-slate-100">
                        {user?.ownerName || user?.name || "Owner"}
                      </div>
                      <div className="text-xs text-ink-muted dark:text-slate-500 truncate">
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

                    {/* Dark mode toggle row inside dropdown */}
                    <button
                      onClick={() => { toggleDarkMode(); setOpen(false); }}
                      className="w-full text-left flex items-center justify-between px-4 py-2 text-sm text-ink-secondary dark:text-slate-300 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors duration-150"
                    >
                      <span className="flex items-center gap-3">
                        {isDarkMode
                          ? <Sun className="w-4 h-4" />
                          : <Moon className="w-4 h-4" />}
                        {isDarkMode ? "Light mode" : "Dark mode"}
                      </span>
                      {/* visual pill indicator */}
                      <span className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors duration-200 ${isDarkMode ? "bg-primary justify-end" : "bg-gray-200 justify-start"}`}>
                        <span className="w-3 h-3 rounded-full bg-white shadow-sm" />
                      </span>
                    </button>

                    <button className="w-full text-left flex items-center px-4 py-2 text-sm text-ink-secondary dark:text-slate-300 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors duration-150">
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </button>

                    <button
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-ink-secondary dark:text-slate-300 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors duration-150"
                      onClick={() => { window.location.href = "/settings"; }}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </button>

                    <div className="border-t border-gray-200 dark:border-dark-border my-1" />

                    <button
                      onClick={() => { logout && logout(true); setOpen(false); }}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-danger hover:bg-danger-light dark:hover:bg-danger/10 transition-colors duration-150"
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
