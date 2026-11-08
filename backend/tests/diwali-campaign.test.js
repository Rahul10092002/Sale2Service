import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";
import MessageLog from "../models/MessageLog.js";
import { handleMsg91WhatsappWebhook } from "../controllers/webhookController.js";
import diwaliCampaignRouter from "../routes/diwaliCampaign.js";
import { DiwaliCampaign, DiwaliRecipient, DiwaliAttempt } from "../models/DiwaliCampaign.js";
import { processCampaignTick, applyCampaignWebhook, retryFailed, webhookAuthorized, prepareCampaign, campaignScope } from "../services/diwaliCampaignService.js";
import { normalizeCampaignPhone, deliveryStatus, allowedPreviousStatuses } from "../../shared/diwaliCampaign.js";

// No connection, dotenv, app startup, or real provider requests. All model I/O is mocked.
const query = value => ({ sort() { return this; }, select() { return this; }, lean: async () => value });
function workerMocks(t, overrides = {}) {
  const calls = { campaign: [], recipients: [], attempts: [], network: [] };
  const campaign = { ...campaignScope, state: "RUNNING", interval_ms: 5000, recipient_cap: 100, shop_name_hi: "परीक्षण दुकान" };
  const recipient = { _id: "recipient", ...campaignScope, customer_id: "customer", phone: "919876543210", status: "QUEUED" };
  let attempt;
  t.mock.method(DiwaliCampaign, "findOneAndUpdate", filter => {
    assert.equal(String(filter.shop_id), String(campaignScope.shop_id));
    assert.equal(filter.state, "RUNNING");
    assert.ok(filter.$and[0].$or.some(condition => condition.lease_until?.$lte instanceof Date));
    assert.ok(filter.$and[1].$or.some(condition => condition.next_send_at?.$lte instanceof Date));
    return query(overrides.noLease ? null : campaign);
  });
  let leaseChecks = 0;
  t.mock.method(DiwaliCampaign, "exists", async () => { leaseChecks += 1; return !(overrides.pauseBeforeSend && leaseChecks > 1); });
  t.mock.method(DiwaliCampaign, "updateOne", async (filter, update) => { calls.campaign.push({ filter, update }); return { modifiedCount: 1 }; });
  t.mock.method(DiwaliRecipient, "find", () => query(overrides.stale ? [{ ...recipient, status: "SENDING", latest_attempt: "old-attempt" }] : []));
  t.mock.method(DiwaliRecipient, "findOne", () => query(recipient));
  t.mock.method(DiwaliRecipient, "updateOne", async (filter, update) => { calls.recipients.push({ filter, update }); return { modifiedCount: 1 }; });
  t.mock.method(DiwaliAttempt, "countDocuments", async () => overrides.attemptCount || 0);
  t.mock.method(DiwaliAttempt, "create", async data => { attempt = { ...data }; calls.attempts.push(data); return attempt; });
  t.mock.method(DiwaliAttempt, "updateOne", async (filter, update) => {
    assert.equal(String(filter.shop_id), String(campaignScope.shop_id));
    if (attempt?.status === filter.status) Object.assign(attempt, update.$set);
    return { modifiedCount: 1 };
  });
  t.mock.method(DiwaliAttempt, "findOne", () => query(attempt));
  t.mock.method(Customer, "findOne", filter => {
    assert.equal(String(filter.shop_id), String(campaignScope.shop_id));
    assert.equal(filter.deleted_at, null);
    return query(overrides.deletedCustomer ? null : { whatsapp_number: "9876543210" });
  });
  t.mock.method(axios, "post", async (...args) => {
    calls.network.push(args);
    if (overrides.failure) throw overrides.failure;
    return { data: overrides.response || { status: "success", request_id: "provider-id" } };
  });
  return calls;
}

test("Indian mobile normalization excludes customer-care short codes and foreign numbers", () => {
  assert.equal(normalizeCampaignPhone("+91 98765-43210"), "919876543210");
  assert.equal(normalizeCampaignPhone("09876543210"), "919876543210");
  for (const value of ["121", "198", "18001234567", "1860123456", "+1 9876543210", "", null]) assert.equal(normalizeCampaignPhone(value), null);
});

test("undelivered is failed; delivered/read cannot regress", () => {
  assert.equal(deliveryStatus("undelivered"), "FAILED");
  assert.equal(deliveryStatus("unknown"), null);
  assert.equal(allowedPreviousStatuses("FAILED").includes("READ"), false);
  assert.equal(allowedPreviousStatuses("SENT").includes("DELIVERED"), false);
});

test("worker sends one single-variable Hindi template with case-sensitive CRQID", async t => {
  const calls = workerMocks(t);
  await processCampaignTick();
  assert.equal(calls.network.length, 1);
  const payload = calls.network[0][1];
  assert.equal(payload.payload.template.name, "dipawali_wish");
  assert.equal(payload.payload.template.language.code, "hi");
  assert.match(payload.CRQID, /^diwali:/);
  assert.deepEqual(payload.payload.template.to_and_components, [{ to: ["919876543210"], components: { body_1: { type: "text", value: "परीक्षण दुकान" } } }]);
  assert.ok(calls.recipients.some(call => call.update.$set.status === "ACCEPTED"));
  assert.ok(calls.campaign.some(call => call.update.$set.next_send_at instanceof Date));
});

test("another worker holding lease prevents any provider call", async t => {
  const calls = workerMocks(t, { noLease: true });
  await processCampaignTick();
  assert.equal(calls.network.length, 0);
});

test("pause after recipient claim prevents provider submission", async t => {
  const calls = workerMocks(t, { pauseBeforeSend: true });
  await processCampaignTick();
  assert.equal(calls.network.length, 0);
  assert.ok(calls.recipients.some(call => call.update.$set.reason?.includes("Not submitted")));
});

test("rolling 24-hour cap pauses before sending", async t => {
  const calls = workerMocks(t, { attemptCount: 100 });
  await processCampaignTick();
  assert.equal(calls.network.length, 0);
  assert.ok(calls.campaign.some(call => call.update.$set.state === "PAUSED"));
});

test("interrupted SENDING attempt becomes UNKNOWN and pauses without resending", async t => {
  const calls = workerMocks(t, { stale: true });
  await processCampaignTick();
  assert.equal(calls.network.length, 0);
  assert.ok(calls.recipients.some(call => call.update.$set.status === "UNKNOWN"));
  assert.ok(calls.campaign.some(call => call.update.$set.state === "PAUSED"));
});

test("provider authentication error pauses instead of failing every customer", async t => {
  const calls = workerMocks(t, { failure: { response: { status: 401, data: { message: "Unauthorized" } } } });
  await processCampaignTick();
  assert.ok(calls.recipients.some(call => call.update.$set.status === "FAILED"));
  assert.ok(calls.campaign.some(call => call.update.$set.state === "PAUSED"));
});

test("removed customer is skipped without a send", async t => {
  const calls = workerMocks(t, { deletedCustomer: true });
  await processCampaignTick();
  assert.equal(calls.network.length, 0);
  assert.ok(calls.recipients.some(call => call.update.$set.status === "SKIPPED"));
});

test("HTTP 429 pauses campaign and respects Retry-After", async t => {
  const before = Date.now();
  const calls = workerMocks(t, { failure: { response: { status: 429, data: { message: "Rate limit" }, headers: { "retry-after": "120" } } } });
  await processCampaignTick();
  assert.ok(calls.recipients.some(call => call.update.$set.status === "FAILED"));
  assert.ok(calls.campaign.some(call => call.update.$set.state === "PAUSED" && call.update.$set.next_send_at >= before + 120000));
});

test("timeout stays UNKNOWN and pauses instead of exposing a duplicate-send retry", async t => {
  const calls = workerMocks(t, { failure: { code: "ECONNABORTED" } });
  await processCampaignTick();
  assert.ok(calls.recipients.some(call => call.update.$set.status === "UNKNOWN"));
  assert.ok(calls.campaign.some(call => call.update.$set.state === "PAUSED"));
});

test("unrecognized success response is UNKNOWN, never assumed rejected", async t => {
  const calls = workerMocks(t, { response: { unexpected: "shape" } });
  await processCampaignTick();
  assert.ok(calls.recipients.some(call => call.update.$set.status === "UNKNOWN"));
});

test("webhook uses exact attempt, tenant and destination, and guards latest retry", async t => {
  let readFilter, writeFilter;
  t.mock.method(DiwaliAttempt, "findOne", filter => { if (filter.phone) readFilter = filter; return query({ _id: "attempt-1", recipient_id: "recipient", status: "DELIVERED" }); });
  t.mock.method(DiwaliAttempt, "updateOne", async () => ({ modifiedCount: 1 }));
  t.mock.method(DiwaliRecipient, "updateOne", async filter => { writeFilter = filter; return { modifiedCount: 1 }; });
  await applyCampaignWebhook({ crqid: "diwali:attempt-1", customerNumber: "919876543210", eventName: "delivered", direction: "1" });
  assert.equal(readFilter._id, "attempt-1");
  assert.equal(String(readFilter.shop_id), String(campaignScope.shop_id));
  assert.equal(readFilter.phone, "919876543210");
  assert.equal(writeFilter.latest_attempt, "attempt-1");
  assert.ok(writeFilter.status.$in.includes("QUEUED")); // Late delivery cancels queued retry.
});

test("duplicate webhook repairs an interrupted recipient update without regressing read status", async t => {
  t.mock.method(DiwaliAttempt, "findOne", () => query({ _id: "attempt", recipient_id: "recipient", status: "READ" }));
  t.mock.method(DiwaliAttempt, "updateOne", async () => ({ modifiedCount: 0 }));
  let finalStatus;
  t.mock.method(DiwaliRecipient, "updateOne", async (filter, update) => { finalStatus = update.$set.status; return { modifiedCount: 1 }; });
  await applyCampaignWebhook({ crqid: "diwali:attempt", customerNumber: "919876543210", eventName: "sent" });
  assert.equal(finalStatus, "READ");
});

test("phone-only, inbound and unrecognized events never update delivery state", async t => {
  t.mock.method(DiwaliAttempt, "findOne", () => { assert.fail("Must not query by phone only"); });
  for (const event of [
    { customerNumber: "919876543210", eventName: "delivered" },
    { customerNumber: "919876543210", eventName: "delivered", direction: "0", crqid: "diwali:x" },
    { customerNumber: "919876543210", eventName: "clicked", crqid: "diwali:x" },
  ]) await applyCampaignWebhook(event);
});

test("manual retry is atomic, scoped and limited to FAILED", async t => {
  t.mock.method(DiwaliRecipient, "updateOne", async filter => {
    assert.equal(filter.status, "FAILED");
    assert.equal(String(filter.shop_id), String(campaignScope.shop_id));
    return { modifiedCount: 0 };
  });
  await assert.rejects(retryFailed("delivered-recipient"), /Only failed/);
});

test("preparation rejects unsafe settings before accessing the database", async () => {
  await assert.rejects(prepareCampaign({ intervalSeconds: 1, recipientCap: 100, exclusions: [], exclusionsReviewed: true }), /pace/);
  await assert.rejects(prepareCampaign({ intervalSeconds: 5, recipientCap: 100, exclusions: [], exclusionsReviewed: false }), /review/);
});

test("webhook authentication fails closed when configuration is missing", () => {
  const old = process.env.MSG91_WEBHOOK_TOKEN;
  try {
    delete process.env.MSG91_WEBHOOK_TOKEN;
    assert.equal(webhookAuthorized({ get: () => "anything" }), false);
    process.env.MSG91_WEBHOOK_TOKEN = "offline-test-value";
    assert.equal(webhookAuthorized({ get: () => "wrong" }), false);
    assert.equal(webhookAuthorized({ get: () => "offline-test-value" }), true);
  } finally {
    if (old === undefined) delete process.env.MSG91_WEBHOOK_TOKEN;
    else process.env.MSG91_WEBHOOK_TOKEN = old;
  }
});

test("campaign callback on existing webhook bypasses invoice and legacy message updates", async t => {
  const old = process.env.MSG91_WEBHOOK_TOKEN;
  process.env.MSG91_WEBHOOK_TOKEN = "offline-test-value";
  t.after(() => { if (old === undefined) delete process.env.MSG91_WEBHOOK_TOKEN; else process.env.MSG91_WEBHOOK_TOKEN = old; });
  t.mock.method(Invoice, "updateMany", () => assert.fail("Campaign must not update invoices"));
  t.mock.method(Customer, "findOne", () => assert.fail("Campaign must not match a customer by phone"));
  t.mock.method(MessageLog, "updateMany", () => assert.fail("Campaign must not update legacy logs"));
  t.mock.method(DiwaliAttempt, "findOne", () => query(null));
  let status;
  const res = { status(code) { status = code; return this; }, json() { return this; } };
  await handleMsg91WhatsappWebhook({ body: { templateName: "dipawali_wish", crqid: "diwali:attempt", customerNumber: "919876543210", eventName: "delivered" }, get: () => "offline-test-value" }, res);
  assert.equal(status, 200);
});

test("server tenant guard rejects another shop even with valid request context", () => {
  const guard = diwaliCampaignRouter.stack[1].handle;
  let code;
  guard({ user: { shopId: "another-shop" } }, { status(value) { code = value; return this; }, json() {} }, () => assert.fail("Another tenant must not reach campaign handlers"));
  assert.equal(code, 403);
});
