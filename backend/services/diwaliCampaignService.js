import { randomUUID, timingSafeEqual } from "node:crypto";
import axios from "axios";
import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Shop from "../models/Shop.js";
import { DiwaliCampaign, DiwaliRecipient, DiwaliAttempt } from "../models/DiwaliCampaign.js";
import { DIWALI_SHOP_ID, DIWALI_CAMPAIGN_ID, DIWALI_TEMPLATE, DIWALI_INITIAL_DEADLINE, campaignDeadlineReached, normalizeCampaignPhone, deliveryStatus, isThrottle, allowedPreviousStatuses } from "../../shared/diwaliCampaign.js";

const shopId = new mongoose.Types.ObjectId(DIWALI_SHOP_ID);
export const campaignScope = { shop_id: shopId, campaign_id: DIWALI_CAMPAIGN_ID };
export const campaignQuery = { _id: DIWALI_CAMPAIGN_ID, shop_id: shopId };
const leaseMs = 60000;

export function webhookAuthorized(req) {
  const expected = process.env.MSG91_WEBHOOK_TOKEN;
  const supplied = req.get("x-msg91-webhook-token");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function audiencePreview(exclusions = []) {
  const [shop, customers] = await Promise.all([
    Shop.findOne({ _id: shopId, deleted_at: null }).select("shop_name_hi").lean(),
    Customer.find({ shop_id: shopId, deleted_at: null }).select("full_name whatsapp_number").sort({ _id: 1 }).lean(),
  ]);
  const excluded = new Set(exclusions);
  const seen = new Set();
  const recipients = customers.map(customer => {
    const phone = normalizeCampaignPhone(customer.whatsapp_number);
    const reason = !phone ? "Customer-care short code or invalid Indian mobile number format" : excluded.has(phone) ? "Manually excluded" : seen.has(phone) ? "Duplicate phone number" : "";
    if (phone) seen.add(phone);
    return { _id: `${DIWALI_CAMPAIGN_ID}:${reason ? customer._id : phone}`, ...campaignScope, customer_id: customer._id,
      name: customer.full_name, phone: phone || String(customer.whatsapp_number || ""), status: reason ? "SKIPPED" : "QUEUED", reason };
  });
  return { shop_name_hi: shop?.shop_name_hi || "", recipients };
}

// Explicit prepare only: no campaign/recipient records are created by GET or startup.
export async function prepareCampaign({ intervalSeconds, recipientCap, exclusions, exclusionsReviewed }) {
  if (!Number.isInteger(intervalSeconds) || intervalSeconds < 5 || intervalSeconds > 3600 ||
      !Number.isInteger(recipientCap) || recipientCap < 1 || recipientCap > 100000 ||
      !Array.isArray(exclusions) || exclusions.length > 10000 || exclusionsReviewed !== true) {
    throw new Error("Enter a pace of 5–3600 seconds, a 24-hour attempt cap, and review exclusions.");
  }
  const normalized = exclusions.map(normalizeCampaignPhone);
  if (normalized.some(phone => !phone)) throw new Error("Exclusions must contain full Indian mobile numbers.");
  let existing = await DiwaliCampaign.findOne(campaignQuery).lean();
  if (!existing) {
    const preview = await audiencePreview(normalized);
    if (!preview.shop_name_hi.trim()) throw new Error("The shop Hindi name must be configured before preparing.");
    try {
      await DiwaliCampaign.create({ ...campaignQuery, state: "PREPARING", shop_name_hi: preview.shop_name_hi.trim(),
        interval_ms: intervalSeconds * 1000, recipient_cap: recipientCap, send_until: new Date(DIWALI_INITIAL_DEADLINE), exclusions: normalized, reason: "Preparing audience" });
    } catch (error) { if (error.code !== 11000) throw error; }
    existing = await DiwaliCampaign.findOne(campaignQuery).lean();
  }
  if (existing.state !== "PREPARING") throw new Error("Campaign is already prepared. Its audience and configuration are frozen.");
  const token = randomUUID();
  const locked = await DiwaliCampaign.findOneAndUpdate({ ...campaignQuery, state: "PREPARING", $or: [{ lease_until: null }, { lease_until: { $lte: new Date() } }] },
    { $set: { lease_token: token, lease_until: new Date(Date.now() + 300000) } }, { new: true }).lean();
  if (!locked) throw new Error("Recipient preparation is already running. Refresh shortly.");
  try {
    const preview = await audiencePreview(locked.exclusions);
    if (preview.recipients.length) await DiwaliRecipient.bulkWrite(preview.recipients.map(recipient => ({
      updateOne: { filter: { _id: recipient._id, ...campaignScope }, update: { $setOnInsert: recipient }, upsert: true },
    })));
    await DiwaliCampaign.updateOne({ ...campaignQuery, state: "PREPARING", lease_token: token }, { $set: { state: "PAUSED", reason: "Prepared. Start manually when ready." } });
  } finally {
    await DiwaliCampaign.updateOne({ ...campaignQuery, lease_token: token }, { $set: { lease_until: new Date(), lease_token: null } });
  }
}

export async function setCampaignRunning(running, requestedDeadline) {
  if (running && !["MSG91_AUTHKEY", "MSG91_API_ENDPOINT", "MSG91_NUMBER", "MSG91_NAMESPACE", "MSG91_WEBHOOK_TOKEN"].every(key => process.env[key])) {
    throw new Error("MSG91 and authenticated delivery webhook configuration are required.");
  }
  const settings = { state: running ? "RUNNING" : "PAUSED", reason: running ? "" : "Paused manually" };
  if (running) {
    const campaign = await DiwaliCampaign.findOne(campaignQuery).lean();
    if (!campaign) throw new Error("Prepare the campaign first.");
    // Explicit date with offset only; never use server-local date interpretation.
    if (requestedDeadline !== undefined && (typeof requestedDeadline !== "string" || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(requestedDeadline))) throw new Error("Provide an explicit sending deadline with timezone.");
    settings.send_until = new Date(requestedDeadline ?? campaign.send_until ?? DIWALI_INITIAL_DEADLINE);
    if (campaignDeadlineReached(settings)) throw new Error("Sending cutoff reached. Select a new future cutoff in the UI, then resume manually.");
  }
  const result = await DiwaliCampaign.updateOne({ ...campaignQuery, state: { $in: running ? ["PAUSED", "COMPLETED"] : ["PAUSED", "RUNNING", "COMPLETED"] } }, {
    $set: settings,
  });
  if (!result.matchedCount) throw new Error("Prepare the campaign first.");
}

export async function retryFailed(recipientId) {
  const result = await DiwaliRecipient.updateOne({ _id: recipientId, ...campaignScope, status: "FAILED" }, {
    $set: { status: "QUEUED", reason: "Manual retry queued" },
  });
  if (!result.modifiedCount) throw new Error("Only failed recipients can be retried.");
}

function providerIds(data) {
  const values = [data?.request_id, data?.requestId, data?.uuid, data?.message_id,
    data?.data?.message_id, data?.data?.request_id, ...(Array.isArray(data?.data) ? data.data.flatMap(item => [item.message_id, item.request_id]) : [])];
  return [...new Set(values.filter(value => typeof value === "string" && value.length > 0))];
}

export async function applyCampaignWebhook(event) {
  if (String(event.direction) === "0" || event.direction === "inbound") return;
  if (event.integratedNumber && String(event.integratedNumber).replace(/\D/g, "") !== String(process.env.MSG91_NUMBER).replace(/\D/g, "")) return;
  const phone = normalizeCampaignPhone(event.customerNumber || event.to || event.destination);
  const status = deliveryStatus(event.eventName || event.status);
  if (!phone || !status) return;
  const ids = [event.requestId, event.request_id, event.uuid, event.oneApiRequestId].filter(value => typeof value === "string" && value);
  const correlation = typeof event.crqid === "string" && event.crqid.startsWith("diwali:") ? event.crqid.slice(7) : null;
  if (!correlation && !ids.length) return; // Never fall back to phone-only matching.
  const identity = correlation ? { _id: correlation } : { provider_ids: { $in: ids } };
  const attempt = await DiwaliAttempt.findOne({ ...campaignScope, phone, ...identity }).lean();
  if (!attempt) return;
  const reason = String(event.reason || event.error || "").slice(0, 2000);
  const set = { status, reason, webhook_at: new Date() };
  if (status === "DELIVERED") set.delivered_at = new Date();
  if (status === "READ") { set.read_at = new Date(); set.delivered_at = new Date(); }
  const result = await DiwaliAttempt.updateOne({ _id: attempt._id, ...campaignScope, status: { $in: allowedPreviousStatuses(status) } }, { $set: set });
  // Reconcile even duplicate callbacks: a prior process may have stopped between these writes.
  const current = await DiwaliAttempt.findOne({ _id: attempt._id, ...campaignScope }).lean();
  if (!current) return;
  const previous = allowedPreviousStatuses(current.status);
  if (["READ", "DELIVERED"].includes(current.status)) previous.push("QUEUED");
  await DiwaliRecipient.updateOne({ _id: attempt.recipient_id, ...campaignScope, latest_attempt: attempt._id, status: { $in: previous } }, { $set: { status: current.status, reason: current.reason || "" } });
  if (result.modifiedCount && status === "FAILED" && isThrottle(reason)) await DiwaliCampaign.updateOne(campaignQuery, { $set: { state: "PAUSED", reason: `Provider restriction: ${reason}` } });
}

// A persistent shop/campaign lease serializes sends across processes and browser tabs.
export async function processCampaignTick() {
  const now = new Date();
  const token = randomUUID();
  const due = [{ next_send_at: null }, { next_send_at: { $lte: now } }, { send_until: { $lte: now } }];
  if (now >= new Date(DIWALI_INITIAL_DEADLINE)) due.push({ send_until: null });
  const campaign = await DiwaliCampaign.findOneAndUpdate({ ...campaignQuery, state: "RUNNING",
    $and: [{ $or: [{ lease_until: null }, { lease_until: { $lte: now } }] },
      { $or: due }] },
  { $set: { lease_until: new Date(Date.now() + leaseMs), lease_token: token } }, { new: true }).lean();
  if (!campaign) return;
  try {
    if (campaignDeadlineReached(campaign)) {
      await DiwaliCampaign.updateOne({ ...campaignQuery, lease_token: token }, { $set: { state: "PAUSED", reason: "Sending cutoff reached. Remaining recipients stay queued. Choose a new cutoff and resume manually; no automatic next-day sending." } });
      return;
    }
    // A crash after a provider request is ambiguous: never automatically resend it.
    const stale = await DiwaliRecipient.find({ ...campaignScope, status: "SENDING", updatedAt: { $lte: new Date(Date.now() - leaseMs) } }).lean();
    for (const recipient of stale) {
      await DiwaliAttempt.updateOne({ _id: recipient.latest_attempt, ...campaignScope, status: "SENDING" }, { $set: { status: "UNKNOWN", reason: "Worker interrupted; delivery outcome unknown. Check provider reports." } });
      await DiwaliRecipient.updateOne({ _id: recipient._id, ...campaignScope, status: "SENDING" }, { $set: { status: "UNKNOWN", reason: "Worker interrupted; check provider reports. Not automatically retried." } });
    }
    if (stale.length) {
      await DiwaliCampaign.updateOne({ ...campaignQuery, lease_token: token }, { $set: { state: "PAUSED", reason: "Interrupted attempts have unknown delivery outcomes. Review provider reports before resuming." } });
      return;
    }
    const attempts = await DiwaliAttempt.countDocuments({ ...campaignScope, createdAt: { $gte: new Date(Date.now() - 86400000) } });
    if (attempts >= campaign.recipient_cap) {
      await DiwaliCampaign.updateOne({ ...campaignQuery, lease_token: token }, { $set: { state: "PAUSED", reason: "Rolling 24-hour attempt cap reached. Resume manually after allowance is available." } });
      return;
    }
    const recipient = await DiwaliRecipient.findOne({ ...campaignScope, status: "QUEUED" }).sort({ _id: 1 }).lean();
    if (!recipient) {
      await DiwaliCampaign.updateOne({ ...campaignQuery, lease_token: token }, { $set: { state: "COMPLETED", reason: "Queue drained. Delivery reports may still arrive." } });
      return;
    }
    const customer = await Customer.findOne({ _id: recipient.customer_id, shop_id: shopId, deleted_at: null }).select("whatsapp_number").lean();
    if (!customer || normalizeCampaignPhone(customer.whatsapp_number) !== recipient.phone) {
      await DiwaliRecipient.updateOne({ _id: recipient._id, ...campaignScope, status: "QUEUED" }, { $set: { status: "SKIPPED", reason: "Customer removed or phone changed since preparation" } });
      return;
    }
    const active = await DiwaliCampaign.exists({ ...campaignQuery, state: "RUNNING", lease_token: token, lease_until: { $gt: new Date() } });
    if (!active) return;
    const attemptId = randomUUID();
    const claimed = await DiwaliRecipient.updateOne({ _id: recipient._id, ...campaignScope, status: "QUEUED" }, {
      $set: { status: "SENDING", latest_attempt: attemptId, reason: "" }, $inc: { attempt_count: 1 },
    });
    if (!claimed.modifiedCount) return;
    await DiwaliAttempt.create({ _id: attemptId, ...campaignScope, recipient_id: recipient._id, phone: recipient.phone, status: "SENDING" });
    // Persist pacing before network I/O, including failures and restart recovery.
    await DiwaliCampaign.updateOne({ ...campaignQuery, lease_token: token }, { $set: { next_send_at: new Date(Date.now() + campaign.interval_ms) } });
    // Recheck after persistence: a pause or long DB stall may have invalidated the lease.
    if (campaignDeadlineReached(campaign) || !await DiwaliCampaign.exists({ ...campaignQuery, state: "RUNNING", lease_token: token, lease_until: { $gt: new Date() } })) {
      const stopped = { status: "FAILED", reason: "Not submitted: sending cutoff reached, campaign paused or worker lease expired before sending" };
      await DiwaliAttempt.updateOne({ _id: attemptId, ...campaignScope, status: "SENDING" }, { $set: stopped });
      await DiwaliRecipient.updateOne({ _id: recipient._id, ...campaignScope, latest_attempt: attemptId, status: "SENDING" }, { $set: stopped });
      return;
    }
    let status = "UNKNOWN", reason = "", response, throttled = false, requestBlocked = false, retryAfterMs = 0;
    try {
      const result = await axios.post(process.env.MSG91_API_ENDPOINT, {
        integrated_number: process.env.MSG91_NUMBER, content_type: "template", CRQID: `diwali:${attemptId}`,
        payload: { messaging_product: "whatsapp", type: "template", template: {
          name: DIWALI_TEMPLATE, language: { code: "hi", policy: "deterministic" }, namespace: process.env.MSG91_NAMESPACE,
          to_and_components: [{ to: [recipient.phone], components: { body_1: { type: "text", value: campaign.shop_name_hi.replace(/\s+/g, " ").trim() } } }],
        } },
      }, { headers: { Authkey: process.env.MSG91_AUTHKEY, "Content-Type": "application/json" }, timeout: 15000 });
      response = result.data;
      throttled = isThrottle(JSON.stringify(response));
      const rejected = response?.success === false || response?.status === "error" || response?.type === "error" || response?.hasError === true;
      const accepted = response?.success === true || response?.status === "success" || response?.type === "success" || response?.hasError === false;
      status = throttled || rejected ? "FAILED" : accepted ? "ACCEPTED" : "UNKNOWN";
      reason = status === "FAILED" ? JSON.stringify(response?.message || response?.error || response || "Provider rejected request").slice(0, 2000) : status === "UNKNOWN" ? "Unrecognized provider response; inspect MSG91 reports before resuming." : "";
    } catch (error) {
      response = error.response?.data;
      const code = error.response?.status;
      requestBlocked = [400, 401, 403, 404].includes(code);
      // Transport timeouts and server errors may have been accepted: do not offer retry.
      status = code && code >= 400 && code < 500 ? "FAILED" : "UNKNOWN";
      reason = status === "UNKNOWN" ? "Provider outcome unknown; inspect MSG91 reports before any further action." : String(response?.message || response?.error || `Provider HTTP ${code}`).slice(0, 2000);
      throttled = code === 429 || isThrottle(JSON.stringify(response));
      const retryAfter = error.response?.headers?.["retry-after"];
      retryAfterMs = /^\d+$/.test(String(retryAfter)) ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now()) || 0;
    }
    await DiwaliAttempt.updateOne({ _id: attemptId, ...campaignScope, status: "SENDING" }, { $set: { status, reason, provider_ids: providerIds(response), sent_at: new Date() } });
    const currentAttempt = await DiwaliAttempt.findOne({ _id: attemptId, ...campaignScope }).lean();
    await DiwaliRecipient.updateOne({ _id: recipient._id, ...campaignScope, latest_attempt: attemptId, status: "SENDING" }, { $set: { status: currentAttempt.status, reason: currentAttempt.reason } });
    if (throttled || requestBlocked || status === "UNKNOWN") await DiwaliCampaign.updateOne({ ...campaignQuery, lease_token: token }, { $set: { state: "PAUSED", reason: throttled ? "Provider rate/quality restriction. Review MSG91 before resuming." : reason,
      next_send_at: new Date(Date.now() + Math.max(60000, retryAfterMs)) } });
  } catch (error) {
    await DiwaliCampaign.updateOne({ ...campaignQuery, lease_token: token }, { $set: { state: "PAUSED", reason: "Worker error. Review interrupted attempts before resuming." } });
    throw error;
  } finally {
    await DiwaliCampaign.updateOne({ ...campaignQuery, lease_token: token }, { $set: { lease_until: new Date(), lease_token: null } });
  }
}

let timer;
export function startDiwaliCampaignWorker() {
  if (timer) return;
  timer = setInterval(() => {
    processCampaignTick().catch(() => console.error("[Diwali campaign] Worker failed; interrupted attempts will not be automatically resent."));
  }, 1000);
  timer.unref();
}
