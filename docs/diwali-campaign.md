# Temporary Diwali campaign

Available only for shop `69bd050b4f47d2c7e3d5c433`, in the sidebar and at `/diwali-campaign`. Server authorization independently checks the JWT shop ID. Existing `schedules_view`, `schedules_create`, and `schedules_edit` permissions apply; no role/database changes are needed.

## Before sending

1. Deploy backend and frontend together. Development/tests must not connect to the database or send provider messages. Do not start `backend/index.js` as a test: existing schedulers can send live messages.
2. Configure the existing MSG91 environment variables and a strong `MSG91_WEBHOOK_TOKEN` on the server. Do not commit or paste its value into logs.
3. In MSG91, configure the callback `/v1/webhooks/msg91/diwali` on your public backend. Set the custom header `x-msg91-webhook-token` to the same secret. Include `crqid`, `customerNumber`, `eventName`, `reason`, `requestId`, `uuid`, `integratedNumber`, `direction`, and `templateName` in the webhook payload. Subscribe to sent, delivered, read and failed events. Outgoing API payloads use case-sensitive `CRQID`; callbacks echo it as `crqid`.
4. Verify callback configuration before checking the confirmation on the page. No live verification has been performed by the coding agent. The existing `/v1/webhooks/msg91` also intercepts explicitly identified campaign events, requiring the same header, and bypasses legacy invoice updates. Prefer the dedicated endpoint. Do not configure both callbacks for the same campaign.
5. Confirm the shop has `shop_name_hi`, and that the approved `dipawali_wish` template uses language `hi` and exactly one body variable with no header/button parameters. The shared content is the user-provided preview; MSG91 sends its approved template.
6. Inspect the read-only customer count, choose a rolling 24-hour attempt cap, and review exclusions. Customer-care short codes, toll-free numbers and non-Indian-mobile formats are skipped; phone formatting does not prove WhatsApp registration. Optional exclusions take full Indian mobile numbers. Five seconds is the default/minimum interval, explicitly approved by the user. This is not an account-wide throughput guarantee: existing invoices/reminders share account quota. Check the provider account allowance before choosing the cap.
7. Prepare the audience, then start manually. No send starts on preparation. Settings and audience freeze once prepared. Failed preparation can be retried; stored original settings are retained. No customer, invoice or festival schedule data is modified by this feature.

## Tracking and retries

The page shows a live progress bar and Success, Failed, Pending, Awaiting delivery, Unknown, and Skipped totals. Success counts delivered/read recipients only; Pending counts queued/currently sending recipients. Processing progress counts recipients no longer queued/sending, including skipped recipients, and is separate from delivery success. Totals cover the entire audience even when the table is filtered or paginated. The table and open attempt history refresh every three seconds while the page is active, refetch on focus/reconnection, and retain the last known counts with a stale-data warning if refresh fails.

Three dedicated operational collections store campaign controls, recipients, and separate attempts. Deterministic IDs prevent duplicate campaigns and phone sends in the audience. All reads/writes are scoped to the shop/campaign. The original festival scheduler skips this shop's `dipawali_wish` template so it cannot race this campaign.

One persistent campaign lease serializes workers. The queue survives restarts and runs while the backend is running, even with the browser closed. Hosting suspension delays progress. An in-flight provider request can finish after pause. At five seconds per attempt, 2,711 attempts require roughly 3 hours 46 minutes, excluding pauses and request latency.

`ACCEPTED` only means API acceptance. `SENT`, `DELIVERED`, `READ` and `FAILED` come from correlated reports; duplicate/out-of-order reports cannot regress delivery. Failed-only manual retries create new attempts while preserving earlier history. Late reports for older attempts cannot overwrite newer attempts. Late successful delivery cancels a queued retry of that same attempt.

HTTP 429 / quality / spam errors pause the campaign; Retry-After imposes a persisted minimum wait of at least 60 seconds. Review MSG91 before manually resuming. Failed recipients remain failed until explicitly queued for retry; resuming the queue alone does not retry them. Rolling caps include retries and unknown attempts. Queue completion does not imply all messages were delivered.

Timeouts, server errors, crashes and unrecognized responses are `UNKNOWN` because the provider may already have accepted a send. They cannot be manually retried in this UI; inspect provider reports. There is intentionally no claim of exactly-once network delivery. Failure reasons may be ambiguous: do not classify every undeliverable number as “not on WhatsApp.”

## Offline verification

From `backend/`: `node --test tests/diwali-campaign.test.js` (mocked models/provider; no DB or network). Backend files also support `node --check`.

From `frontend/`: `npm run build` and ESLint for changed files. If Windows temp discovery is denied, set `TEMP` and `TMP` to an existing writable workspace-local temporary directory for the build process.

Provider references: [CRQID case and placement](https://msg91.com/help/whatsapp/how-to-pass-crqid-in-whatsapp-), [delivery report payloads and custom headers](https://msg91.com/help/webhook-new/how-to-receive-whatsapp-delivery-reports-via-webhook-new).

After the campaign, pause it before removing the temporary sidebar/route and worker wiring. Retain tracking records; this feature provides no deletion endpoint.
