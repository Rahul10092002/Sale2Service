import React, { useState } from "react";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Phone,
  Power,
  Clock,
  Sparkles,
  Info,
  Check,
  XCircle,
} from "lucide-react";
import {
  useGetGoogleContactsStatusQuery,
  useLazyGetGoogleAuthUrlQuery,
  useDisconnectGoogleAccountMutation,
  useToggleGoogleAutoSyncMutation,
  useRetryGoogleContactsSyncMutation,
  useGetGoogleContactsLogsQuery,
} from "../../services/baseApi.js";
import { DeleteConfirmModal } from "../../components/ui/index.js";

export function GoogleContactsTab() {
  const { data: statusData, isLoading: isStatusLoading, refetch: refetchStatus } =
    useGetGoogleContactsStatusQuery();
  const [triggerGetAuthUrl, { isFetching: isGeneratingUrl }] =
    useLazyGetGoogleAuthUrlQuery();
  const [disconnectAccount, { isLoading: isDisconnecting }] =
    useDisconnectGoogleAccountMutation();
  const [toggleAutoSync, { isLoading: isToggling }] =
    useToggleGoogleAutoSyncMutation();
  const [retrySync, { isLoading: isRetrying }] =
    useRetryGoogleContactsSyncMutation();

  const [logPage, setLogPage] = useState(1);
  const { data: logsData, isFetching: isLogsFetching } =
    useGetGoogleContactsLogsQuery({ page: logPage, limit: 10 });

  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const status = statusData?.data || {
    is_connected: false,
    connected_email: null,
    connected_name: null,
    connected_picture: null,
    auto_sync_enabled: true,
    total_synced_contacts: 0,
    total_skipped_duplicates: 0,
    last_sync_at: null,
    last_sync_status: "IDLE",
    last_sync_error: null,
    pending_failures: 0,
    unsynced_customers: 0,
  };

  const logs = logsData?.data?.logs || [];
  const pagination = logsData?.data?.pagination || { page: 1, total: 0, pages: 1 };

  const handleConnect = async () => {
    try {
      // Direct the browser to our backend auth-url endpoint or frontend redirect
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const result = await triggerGetAuthUrl({ redirect_uri: redirectUri }).unwrap();
      if (result?.data?.auth_url) {
        window.location.href = result.data.auth_url;
      }
    } catch (err) {
      console.error("Failed to initiate Google OAuth:", err);
    }
  };

  const handleConfirmDisconnect = async () => {
    try {
      await disconnectAccount().unwrap();
      setShowDisconnectModal(false);
      refetchStatus();
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

  const handleToggle = async (e) => {
    const nextVal = e.target.checked;
    await toggleAutoSync({ enabled: nextVal });
  };

  if (isStatusLoading) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-12 text-center flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
          Loading Google Contacts integration status…
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ── Card 1: Connection & Authentication ── */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40 dark:from-blue-950/20 dark:via-dark-card dark:to-indigo-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-dark-input border border-gray-200/80 dark:border-dark-border flex items-center justify-center shrink-0 shadow-xs">
                {/* Google "G" multicolored SVG */}
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                    Google Contacts Auto-Sync
                  </h3>
                  {status.is_connected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-dark-hover dark:text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      Not Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xl">
                  Automatically saves new billing customers to your shopkeeper Google Contacts
                  account in <span className="font-semibold text-gray-700 dark:text-slate-300">+91 format</span> with duplicate protection.
                </p>
              </div>
            </div>

            {/* Action Button: Connect or Disconnect */}
            <div className="flex items-center gap-2 shrink-0">
              {status.is_connected ? (
                <button
                  type="button"
                  onClick={() => setShowDisconnectModal(true)}
                  disabled={isDisconnecting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Disconnect Account</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isGeneratingUrl}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
                >
                  {isGeneratingUrl ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  <span>Connect Google Account</span>
                </button>
              )}
            </div>
          </div>

          {/* Connected Account User Details Strip */}
          {status.is_connected && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                {status.connected_picture ? (
                  <img
                    src={status.connected_picture}
                    alt={status.connected_name || "Google"}
                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-dark-border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold flex items-center justify-center text-xs">
                    {(status.connected_name || status.connected_email || "G").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-gray-900 dark:text-slate-100">
                    {status.connected_name || "Google Account"}
                  </div>
                  <div className="text-gray-500 dark:text-slate-400 text-[11px] font-mono">
                    {status.connected_email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-gray-500 dark:text-slate-400 text-[11px]">
                {status.last_sync_at && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    Last sync:{" "}
                    <span className="font-semibold text-gray-700 dark:text-slate-300">
                      {new Date(status.last_sync_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sync Controls & Toggles */}
        {status.is_connected && (
          <div className="p-4 sm:p-6 bg-gray-50/50 dark:bg-dark-input/20 space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 dark:border-dark-border bg-white dark:bg-dark-card">
              <div className="pr-4">
                <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Auto-Sync on Bill Generation</span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Whenever an invoice is created, check Google Contacts for the customer's phone.
                  If not found, creates the contact instantly.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={status.auto_sync_enabled}
                  onChange={handleToggle}
                  disabled={isToggling}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-dark-border peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ── Card 2: Stats & Metrics ── */}
      {status.is_connected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-100 dark:border-dark-border shadow-xs">
            <div className="text-gray-500 dark:text-slate-400 text-xs font-medium">
              Contacts Synced
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">
              {status.total_synced_contacts.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Created in Google
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-100 dark:border-dark-border shadow-xs">
            <div className="text-gray-500 dark:text-slate-400 text-xs font-medium">
              Duplicates Prevented
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">
              {status.total_skipped_duplicates.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Already in Contacts
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-100 dark:border-dark-border shadow-xs">
            <div className="text-gray-500 dark:text-slate-400 text-xs font-medium">
              Unsynced Customers
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">
              {status.unsynced_customers.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
              Available to sync
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-100 dark:border-dark-border shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-gray-500 dark:text-slate-400 text-xs font-medium">
                Sync Recovery
              </div>
              <div className="text-xs font-bold text-gray-900 dark:text-slate-100 mt-1">
                {status.pending_failures > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400">
                    {status.pending_failures} failed syncs
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">All healthy</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => retrySync()}
              disabled={isRetrying}
              className="mt-2 w-full py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`} />
              <span>{isRetrying ? "Syncing…" : "Sync Unsynced"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Card 3: Recent Activity Logs ── */}
      {status.is_connected && (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-xs overflow-hidden">
          <div className="p-4 sm:px-6 py-3.5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">
                Recent Google Contacts Sync Activity
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Live audit trail of contacts checked, created, or skipped
              </p>
            </div>
            {isLogsFetching && (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />
            )}
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 dark:text-slate-400">
              No contacts have been synced yet. Create a bill to see auto-sync in action!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-dark-input/60 text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-dark-border">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Customer</th>
                    <th className="py-2.5 px-4 font-semibold">Phone (+91)</th>
                    <th className="py-2.5 px-4 font-semibold">Action</th>
                    <th className="py-2.5 px-4 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-border/60">
                  {logs.map((log) => {
                    let badgeCls = "bg-gray-100 text-gray-700 dark:bg-dark-hover dark:text-slate-300";
                    let label = log.action;

                    if (log.action === "CREATED") {
                      badgeCls =
                        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50";
                      label = "Contact Created";
                    } else if (log.action === "SKIPPED_DUPLICATE") {
                      badgeCls =
                        "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50";
                      label = "Skipped (Duplicate)";
                    } else if (log.action === "FAILED") {
                      badgeCls =
                        "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50";
                      label = "Failed";
                    }

                    return (
                      <tr key={log._id} className="hover:bg-gray-50/50 dark:hover:bg-dark-hover/30 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-gray-900 dark:text-slate-100">
                          {log.customer_name || "Customer"}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-gray-600 dark:text-slate-300">
                          {log.phone_number}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${badgeCls}`}
                          >
                            {label}
                          </span>
                          {log.error_message && (
                            <span className="block text-[10px] text-rose-500 mt-0.5 truncate max-w-xs" title={log.error_message}>
                              {log.error_message}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-gray-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                          {new Date(log.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="p-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={logPage <= 1}
                onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-gray-100 dark:bg-dark-hover disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-gray-500 dark:text-slate-400">
                Page {logPage} of {pagination.pages}
              </span>
              <button
                type="button"
                disabled={logPage >= pagination.pages}
                onClick={() => setLogPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-gray-100 dark:bg-dark-hover disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Card 4: How It Works Info Box ── */}
      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 p-4 sm:p-5 text-xs text-indigo-900 dark:text-indigo-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-indigo-950 dark:text-indigo-100">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>How Google Contacts Auto-Sync Works</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-indigo-800/90 dark:text-indigo-300 text-[11px] leading-relaxed">
          <li>
            <strong>Shop Isolation:</strong> Each shopkeeper's Google account is isolated and stored with AES-256-GCM encrypted refresh tokens.
          </li>
          <li>
            <strong>+91 Phone Normalization:</strong> Any phone number format entered during billing is automatically standardized into international E.164 <code className="bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded font-mono">+91XXXXXXXXXX</code> format.
          </li>
          <li>
            <strong>Zero Duplicates:</strong> Before adding, Google Contacts is queried by phone number. If the number is already present, the contact creation is skipped.
          </li>
          <li>
            <strong>Automatic Token Refresh:</strong> Google OAuth tokens are seamlessly refreshed in the background without interrupting your workflow.
          </li>
        </ul>
      </div>

      {/* Disconnect Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDisconnectModal}
        title="Disconnect Google Account?"
        message="Are you sure you want to disconnect this Google Account? Auto-sync for new billing customers will be paused until reconnected."
        confirmText="Disconnect"
        cancelText="Cancel"
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setShowDisconnectModal(false)}
      />
    </div>
  );
}

export default GoogleContactsTab;

