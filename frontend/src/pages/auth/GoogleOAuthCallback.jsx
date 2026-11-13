import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { showToast } from "../../features/ui/uiSlice.js";
import { useExchangeGoogleCodeMutation } from "../../services/baseApi.js";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { ROUTES } from "../../utils/constants.js";

export default function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [exchangeCode] = useExchangeGoogleCodeMutation();

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const initialError =
    errorParam ||
    (!code || !state ? "Missing authorization parameters from Google." : null);

  const [asyncStatus, setAsyncStatus] = useState("idle"); // "idle" | "success" | "error"
  const [asyncError, setAsyncError] = useState("");

  const status = initialError
    ? "error"
    : asyncStatus === "idle"
      ? "processing"
      : asyncStatus;
  const errorMessage = initialError || asyncError;

  useEffect(() => {
    if (initialError) {
      dispatch(
        showToast({
          message: `Google authentication failed: ${initialError}`,
          type: "error",
        })
      );
      return;
    }

    let isMounted = true;
    const completeOAuth = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const res = await exchangeCode({
          code,
          state,
          redirect_uri: redirectUri,
        }).unwrap();

        if (!isMounted) return;
        setAsyncStatus("success");
        dispatch(
          showToast({
            message: `Connected Google Account: ${res.data?.email || "Success"}`,
            type: "success",
          })
        );

        setTimeout(() => {
          navigate(`${ROUTES.SETTINGS}?tab=google`, { replace: true });
        }, 1200);
      } catch (err) {
        if (!isMounted) return;
        console.error("Exchange code error:", err);
        setAsyncStatus("error");
        const msg =
          err?.data?.message ||
          err?.message ||
          "Failed to complete Google authentication";
        setAsyncError(msg);
        dispatch(
          showToast({
            message: msg,
            type: "error",
          })
        );
      }
    };

    completeOAuth();

    return () => {
      isMounted = false;
    };
  }, [code, state, initialError, exchangeCode, dispatch, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-dark-bg">
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center space-y-4">
        {status === "processing" && (
          <div className="space-y-3">
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">
              Connecting Google Contacts…
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Securing credentials and verifying your account. Please wait a moment.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-3 animate-in fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">
              Google Account Connected!
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Redirecting back to your shop settings…
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 animate-in fade-in">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">
              Connection Failed
            </h2>
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/60 dark:border-rose-900/60 text-left font-mono">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => navigate(`${ROUTES.SETTINGS}?tab=google`, { replace: true })}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Return to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

