import { useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { DIWALI_SHOP_ID } from "../../../../shared/diwaliCampaign.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useGetDiwaliCampaignQuery, useGetDiwaliAttemptsQuery, useDiwaliActionMutation } from "../../features/festival/diwaliCampaignApi.js";

const statuses = ["QUEUED", "SKIPPED", "SENDING", "UNKNOWN", "ACCEPTED", "SENT", "DELIVERED", "READ", "FAILED"];
const inputClass = "rounded border border-slate-300 p-2 bg-white dark:bg-slate-900 w-full";
const buttonClass = "rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-40";
const date = value => value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—";

function CampaignProgress({ counts = {}, updatedAt, refreshing, stale }) {
  const success = (counts.DELIVERED || 0) + (counts.READ || 0);
  const failed = counts.FAILED || 0;
  const pending = (counts.QUEUED || 0) + (counts.SENDING || 0);
  const awaiting = (counts.ACCEPTED || 0) + (counts.SENT || 0);
  const unknown = counts.UNKNOWN || 0;
  const skipped = counts.SKIPPED || 0;
  const total = success + failed + pending + awaiting + unknown + skipped;
  const processed = total - pending;
  const percent = total ? Math.round(processed / total * 100) : 0;
  const cards = [
    { label: "Success", value: success, detail: "Delivered, including read", color: "bg-emerald-500" },
    { label: "Failed", value: failed, detail: "Delivery or send failed", color: "bg-red-500" },
    { label: "Pending", value: pending, detail: `${counts.QUEUED || 0} queued · ${counts.SENDING || 0} sending`, color: "bg-blue-500" },
    { label: "Awaiting delivery", value: awaiting, detail: "Accepted / sent; awaiting confirmation", color: "bg-amber-500" },
    { label: "Unknown", value: unknown, detail: "Needs review; no automatic retry", color: "bg-violet-500" },
    { label: "Skipped", value: skipped, detail: "Excluded or invalid numbers", color: "bg-slate-400" },
  ];
  return <section aria-label="Live message progress" className="border rounded-xl p-4 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">Live sending progress</h2>
      <p className={`text-xs ${stale ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
        {stale ? "Updates unavailable — showing last received counts" : refreshing ? "Updating…" : "Refreshes every 3 seconds while this page is active"}
        {updatedAt && <span className="block">Last updated {date(updatedAt)} IST</span>}
      </p>
    </div>
    <p aria-live="polite" aria-atomic="true" className="text-sm">{processed.toLocaleString()} / {total.toLocaleString()} recipients processed ({percent}%) · {success.toLocaleString()} successful · {failed.toLocaleString()} failed · {pending.toLocaleString()} pending</p>
    <div role="progressbar" aria-label="Recipient processing progress" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={processed} aria-valuetext={`${processed} of ${total} processed; ${success} delivered, ${failed} failed, ${pending} pending`} className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      {cards.filter(card => card.value > 0).map(card => <div key={card.label} className={`${card.color} transition-all duration-500`} style={{ width: `${card.value / total * 100}%` }} />)}
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">{cards.map(card => <div key={card.label} className="rounded-lg border p-3">
      <p className="flex items-center gap-2 text-sm"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${card.color}`} />{card.label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{card.value.toLocaleString()}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.detail}</p>
    </div>)}</div>
    <p className="text-sm">Read: <strong>{counts.READ || 0}</strong> · Delivered, not yet reported read: <strong>{counts.DELIVERED || 0}</strong>. Processing progress includes skipped and attempted recipients; success requires a delivery or read webhook.</p>
  </section>;
}

function AttemptHistory({ recipientId }) {
  const { data, isFetching, error } = useGetDiwaliAttemptsQuery(recipientId, { pollingInterval: 3000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true });
  return <div className="overflow-x-auto p-3 bg-slate-50 dark:bg-slate-900">
    <h3 className="font-semibold mb-2">Send attempts · times in IST</h3>
    {isFetching && <p>Updating…</p>}
    {error && <p role="alert">Could not load attempt history.</p>}
    <table className="w-full text-xs"><thead><tr>{["Attempt", "Created", "Status", "Delivered", "Read", "Last webhook", "Reason"].map(label => <th key={label} className="text-left p-2">{label}</th>)}</tr></thead>
      <tbody>{data?.attempts.map(attempt => <tr key={attempt._id}>
        <td className="p-2 break-all">{attempt._id}</td><td className="p-2">{date(attempt.createdAt)}</td><td className="p-2">{attempt.status}</td>
        <td className="p-2">{date(attempt.delivered_at)}</td><td className="p-2">{date(attempt.read_at)}</td><td className="p-2">{date(attempt.webhook_at)}</td><td className="p-2">{attempt.reason || "—"}</td>
      </tr>)}</tbody></table>
  </div>;
}

function CampaignPanel() {
  const { hasPermission } = usePermissions();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [recipientCap, setRecipientCap] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [webhookConfirmed, setWebhookConfirmed] = useState(false);
  const [historyId, setHistoryId] = useState(null);
  const [notice, setNotice] = useState("");
  const { data, error, isLoading, isFetching, fulfilledTimeStamp, refetch } = useGetDiwaliCampaignQuery({ page, status }, {
    pollingInterval: 3000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true,
  });
  const [mutate, { isLoading: busy }] = useDiwaliActionMutation();
  const campaign = data?.campaign;
  const act = async (action, body) => {
    setNotice("");
    try { await mutate({ action, body }).unwrap(); setNotice("Saved."); refetch(); }
    catch (failure) { setNotice(failure?.data?.message || "Request failed. Refresh to check the current state before trying again."); }
  };
  if (isLoading) return <p className="p-6">Loading campaign…</p>;
  if (error && !data) return <div className="p-6" role="alert">Unable to load campaign. <button className={buttonClass} onClick={refetch}>Try again</button></div>;
  const ready = campaign && !["DRAFT", "PREPARING"].includes(campaign.state);
  return <div className="p-4 md:p-6 space-y-5 text-slate-800 dark:text-slate-100">
    <header><h1 className="text-2xl font-bold">Diwali wishes</h1><p className="text-sm mt-1">Temporary campaign · dipawali_wish · Hindi · this shop only</p></header>
    {notice && <p role="status" className="border rounded p-3">{notice}</p>}
    {ready && <CampaignProgress counts={data.counts} updatedAt={fulfilledTimeStamp} refreshing={isFetching} stale={Boolean(error)} />}
    {error && <p role="alert" className="text-red-600 dark:text-red-400">Live refresh failed. Displayed statuses may be out of date. <button className="underline" onClick={refetch}>Retry refresh</button></p>}
    <section className="border rounded-xl p-4 space-y-3">
      <h2 className="font-semibold">{campaign?.state || "Not prepared"}</h2>
      <p>{campaign?.reason}</p>
      <p>Hindi shop name: <strong>{campaign?.shop_name_hi || data?.preview?.shop_name_hi || "Missing — configure in shop settings"}</strong></p>
      {!ready ? <>
        <p>{data?.preview ? `${data.preview.total} customers · ${data.preview.eligible} mobile-format numbers · ${data.preview.skipped} invalid numbers` : "Preparation was interrupted. Retry with the original settings."}</p>
        <p className="text-sm">Customer-care short codes and numbers outside Indian mobile format are skipped. Mobile format alone does not confirm WhatsApp availability; delivery failures appear below.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <label>Seconds between messages<input className={inputClass} type="number" min="5" max="3600" value={intervalSeconds} onChange={event => setIntervalSeconds(event.target.value)} /></label>
          <label>Maximum attempts in a rolling 24 hours<input className={inputClass} type="number" min="1" max="100000" placeholder="Enter your chosen cap" value={recipientCap} onChange={event => setRecipientCap(event.target.value)} /></label>
        </div>
        <label className="block">Additional mobile numbers to exclude (optional)<textarea className={inputClass} value={exclusions} onChange={event => setExclusions(event.target.value)} placeholder="One number per line, or separated by commas" /></label>
        <label className="flex gap-2"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I reviewed the recipients and exclusions.</label>
        <p className="text-sm">Preparation saves the recipient list; it does not send messages. At 5 seconds each, 2,711 attempts take about 3 hours 46 minutes before pauses. The cap counts campaign attempts including retries; other account traffic also uses provider limits.</p>
        <button className={buttonClass} disabled={busy || !reviewed || !recipientCap || !hasPermission("schedules_create")} onClick={() => act("prepare", {
          intervalSeconds: Number(intervalSeconds), recipientCap: Number(recipientCap), exclusions: exclusions.split(/[\n,]+/).map(value => value.trim()).filter(Boolean), exclusionsReviewed: reviewed,
        })}>Prepare recipient list</button>
      </> : <>
        <p>One attempt every {campaign.interval_ms / 1000} seconds · cap {campaign.recipient_cap} attempts per rolling 24 hours · {data.attemptCount} total attempts</p>
        <p className="text-sm">Pacing reduces rate-limit risk; provider quality and recipient limits can still block messages. The campaign pauses on rate/quality restrictions or uncertain outcomes. Pausing allows an in-flight request to finish.</p>
        <label className="flex gap-2"><input type="checkbox" checked={webhookConfirmed} onChange={event => setWebhookConfirmed(event.target.checked)} />Delivery webhook is configured and tested with attempt correlation and authentication.</label>
        <div className="flex flex-wrap gap-3">
          <button className={buttonClass} disabled={busy || campaign.state === "RUNNING" || !webhookConfirmed || !hasPermission("schedules_edit")} onClick={() => act("start", { webhookConfirmed })}>Start / resume queue</button>
          <button className={buttonClass} disabled={busy || campaign.state !== "RUNNING" || !hasPermission("schedules_edit")} onClick={() => act("pause")}>Pause</button>
          <button className={buttonClass} onClick={refetch}>Refresh</button>
        </div>
      </>}
    </section>
    <details className="border rounded-xl p-4"><summary className="cursor-pointer font-semibold">Message preview</summary><p className="whitespace-pre-wrap mt-3">{data?.content?.replace("{{1}}", campaign?.shop_name_hi || data?.preview?.shop_name_hi || "{{Hindi shop name}}")}</p></details>
    {ready && <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">{statuses.map(value => <button key={value} className="rounded border p-3 text-left" onClick={() => { setStatus(value); setPage(1); }}><span className="block text-xs">{value}</span><strong className="text-xl">{data.counts?.[value] || 0}</strong></button>)}</div>
      <p className="text-sm">ACCEPTED means the provider accepted the request. DELIVERED and READ require webhook confirmation. UNKNOWN is not retried automatically. A failed delivery does not always prove the number is absent from WhatsApp.</p>
      <div className="flex gap-3 items-center"><label>Status <select className={inputClass} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></label><p>{data.total} matching recipients</p></div>
      <div className="overflow-x-auto border rounded-xl"><table className="w-full text-sm"><thead><tr>{["Customer", "Number", "Status", "Attempts", "Failure / skip reason", "Actions"].map(label => <th key={label} className="text-left p-3">{label}</th>)}</tr></thead>
        <tbody>{data.recipients?.map(row => <tr key={row._id} className="border-t"><td className="p-3">{row.name}</td><td className="p-3">{row.phone}</td><td className="p-3">{row.status}</td><td className="p-3">{row.attempt_count}</td><td className="p-3">{row.reason || "—"}</td><td className="p-3"><div className="flex gap-2">
          <button className="underline" onClick={() => setHistoryId(historyId === row._id ? null : row._id)}>History</button>
          {row.status === "FAILED" && hasPermission("schedules_edit") && <button className={buttonClass} disabled={busy} onClick={() => act(`retry/${encodeURIComponent(row._id)}`)}>Queue retry</button>}
        </div></td></tr>)}</tbody></table></div>
      {historyId && <AttemptHistory recipientId={historyId} />}
      <div className="flex gap-4 items-center"><button className={buttonClass} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} / {Math.max(1, Math.ceil(data.total / 50))}</span><button className={buttonClass} disabled={page * 50 >= data.total} onClick={() => setPage(page + 1)}>Next</button></div>
    </>}
  </div>;
}

export default function DiwaliCampaign() {
  const shopId = useSelector(state => state.auth.shopId);
  const { hasPermission } = usePermissions();
  if (String(shopId) !== DIWALI_SHOP_ID || !hasPermission("schedules_view")) return <Navigate to="/dashboard" replace />;
  return <CampaignPanel />;
}
