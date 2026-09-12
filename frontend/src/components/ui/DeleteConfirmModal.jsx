import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  X,
  CheckCircle2,
} from "lucide-react";
import { useVerifyDeletePasswordMutation } from "../../features/auth/authApi.js";

export default function DeleteConfirmModal({
  isOpen,
  itemName = "this item",
  itemType = "Item",
  isSkippedAuth = false,
  onConfirm,
  onCancel,
}) {
  // Step: "PASSWORD" | "CONFIRM"
  const [step, setStep] = useState(isSkippedAuth ? "CONFIRM" : "PASSWORD");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [skipFiveMinutes, setSkipFiveMinutes] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [verifyDeletePassword, { isLoading: loading }] =
    useVerifyDeletePasswordMutation();

  const inputRef = useRef(null);
  const confirmBtnRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setErrorMessage("");
      setShowPassword(false);
      const initialStep = isSkippedAuth ? "CONFIRM" : "PASSWORD";
      setStep(initialStep);

      if (initialStep === "PASSWORD") {
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setTimeout(() => confirmBtnRef.current?.focus(), 100);
      }
    }
  }, [isOpen, isSkippedAuth]);

  // Focus confirm button when transitioning to CONFIRM step
  useEffect(() => {
    if (isOpen && step === "CONFIRM") {
      setTimeout(() => confirmBtnRef.current?.focus(), 100);
    }
  }, [isOpen, step]);

  // Keyboard shortcut listener (Esc to close)
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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage("Please enter the delete security password.");
      return;
    }

    setErrorMessage("");

    try {
      await verifyDeletePassword({
        delete_password: password,
      }).unwrap();

      // If user checked "Skip for 5 minutes", set timestamp in sessionStorage
      if (skipFiveMinutes) {
        const authUntil = Date.now() + 5 * 60 * 1000; // 5 minutes in ms
        sessionStorage.setItem("wd_delete_auth_until", authUntil.toString());
      }

      // Password verified -> transition to second confirmation step
      setStep("CONFIRM");
    } catch (err) {
      console.error("Delete password verification failed:", err);
      setErrorMessage(
        err?.data?.message ||
          err?.message ||
          "Incorrect delete security password. Please try again.",
      );
    }
  };

  const handleFinalConfirm = () => {
    onConfirm();
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

        {step === "PASSWORD" ? (
          /* STEP 1: PASSWORD VERIFICATION */
          <>
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
                  Step 1 of 2 • Password Authorization
                </p>
              </div>
            </div>

            {/* Subtitle Warning */}
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-5 leading-relaxed">
              You are requesting to delete{" "}
              <strong className="text-gray-900 dark:text-slate-100 font-semibold">
                "{itemName}"
              </strong>
              . Enter the Delete Security Password to authorize.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
                    "Authorize & Continue"
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* STEP 2: FINAL YES/NO CONFIRMATION */
          <>
            {/* Header Icon & Title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  Confirm Permanent Delete?
                </h3>
                {isSkippedAuth ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Session Authorized (5 min active)
                  </p>
                ) : (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Step 2 of 2 • Final Verification
                  </p>
                )}
              </div>
            </div>

            {/* Target Item Callout Card */}
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl mb-4">
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block mb-1">
                Item to be deleted:
              </span>
              <div className="font-bold text-gray-900 dark:text-white text-base break-words">
                {itemName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Type: {itemType}
              </div>
            </div>

            <p className="text-sm text-gray-700 dark:text-slate-200 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this {itemType.toLowerCase()}?{" "}
              <strong className="text-red-600 dark:text-red-400">
                This action is permanent and cannot be undone.
              </strong>
            </p>

            {/* Final Decision Yes/No Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                No, Keep It
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleFinalConfirm}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-colors shadow-md flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Delete Permanently
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
