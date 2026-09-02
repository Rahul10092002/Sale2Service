import React, { useState, useEffect, useRef } from "react";
import { ShieldAlert, Eye, EyeOff, Lock, X } from "lucide-react";
import { getToken } from "../../utils/token.js";

const API_BASE_URL =
  import.meta.env.VITE_ENVIRONMENT === "production"
    ? import.meta.env.VITE_PROD_API_URL
    : import.meta.env.VITE_LOCAL_API_URL;

export default function DeleteConfirmModal({
  isOpen,
  itemName = "this item",
  itemType = "Item",
  onConfirm,
  onCancel,
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [skipFiveMinutes, setSkipFiveMinutes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const inputRef = useRef(null);

  // Focus input when modal opens & reset state
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setErrorMessage("");
      setLoading(false);
      setShowPassword(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Enter to submit, Esc to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage("Please enter the delete security password.");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/auth/verify-delete-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ delete_password: password }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Incorrect delete security password. Please try again.",
        );
      }

      // If user checked "Skip for 5 minutes", set timestamp in sessionStorage
      if (skipFiveMinutes) {
        const authUntil = Date.now() + 5 * 60 * 1000; // 5 minutes in ms
        sessionStorage.setItem("wd_delete_auth_until", authUntil.toString());
      }

      // Action authorized successfully
      onConfirm();
    } catch (err) {
      console.error("Delete password verification failed:", err);
      setErrorMessage(
        err.message || "Network error. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-dark-card border border-red-200 dark:border-red-900/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
              Delete {itemType}?
            </h3>
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              Protection Enabled • Authorization Required
            </p>
          </div>
        </div>

        {/* Subtitle Warning */}
        <p className="text-sm text-gray-600 dark:text-slate-300 mb-5 leading-relaxed">
          You are about to delete{" "}
          <strong className="text-gray-900 dark:text-slate-100 font-semibold">
            "{itemName}"
          </strong>
          . This action cannot be undone. Enter the Delete Security Password to authorize.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              Delete Security Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter delete password..."
                className={`w-full pl-9 pr-10 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-dark-bg dark:text-slate-100 ${
                  errorMessage
                    ? "border-red-500"
                    : "border-gray-300 dark:border-dark-border"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errorMessage && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1.5 animate-in fade-in">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Skip for 5 minutes Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skipFiveMinutes}
              onChange={(e) => setSkipFiveMinutes(e.target.checked)}
              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-gray-300"
            />
            <div>
              <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 block">
                Skip password for 5 minutes
              </span>
              <span className="text-[11px] text-gray-500 dark:text-slate-400 block">
                Subsequent deletes won't prompt for password for 5 mins
              </span>
            </div>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                "Confirm Deletion"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
