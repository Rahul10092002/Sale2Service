# AGENTS.md — WarrantyDesk (Sale2Service)

Guidelines, architecture patterns, and operational boundaries for AI coding agents working on WarrantyDesk.

---

## 1. Project Overview & Repository Structure

WarrantyDesk is a multi-tenant MERN web application for managing retail and service shops specializing in batteries, inverters, solar equipment, and electronics. It handles customer management, sequential tax invoicing (GST), inventory receiving slips, warranty tracking, scheduled maintenance reminders, and WhatsApp communications.

The workspace is organized into two isolated applications and one shared contract layer:

```
WarrantyDesk/
├── backend/            # Express 5 REST API, Mongoose 9, MongoDB (Node ESM)
├── frontend/           # React 19 SPA, Vite 7 (SWC), Tailwind CSS v4, RTK Query
├── shared/             # Cross-tier business contracts (invoiceMath.js)
├── docs/               # Architecture diagrams and planning artifacts
└── .github/workflows/  # wake-server.yml (Render health ping cron)
```

---

## 2. Package Managers & Verified Commands

Both `backend/` and `frontend/` are isolated `npm` projects. Always run commands from within the respective directory. **Never invent scripts not present in `package.json`.**

### Backend (`cd backend`)
- **Package Manager**: `npm` (lockfile: `package-lock.json`).
- **Install**: `npm install` *(triggers `postinstall`: `node scripts/install-chrome.js`, which installs Chrome into `.cache/puppeteer`)*.
- **Development**:
  - Configured script: `"dev": "NODE_ENV=development node index.js"`.
  - **Windows Note**: Inline `NODE_ENV=development` uses POSIX syntax. In Windows PowerShell, run:
    ```powershell
    $env:NODE_ENV="development"; node index.js
    ```
    Alternatively, run `npm start` (`node index.js`), which defaults to development behavior if unset.
- **Start (Production)**: `npm start` (`node index.js`).
- **Lint / Type-Check**: None configured.
- **Build**: None required (native Node ESM runtime).

### Frontend (`cd frontend`)
- **Package Manager**: `npm` (lockfile: `package-lock.json`).
- **Install**: `npm install`.
- **Development**: `npm run dev` *(starts Vite dev server at `http://localhost:5173`)*.
- **Build**: `npm run build` *(compiles production bundle to `dist/`)*.
- **Lint**: `npm run lint` *(runs `eslint .` via ESLint 9 flat config)*.
- **Preview**: `npm run preview` *(starts Vite local preview server)*.
- **Type-Check**: None configured (pure JS/JSX).

---

## 3. Testing, Verification & Script Safety

### Test Runner Status
- **Backend `npm test`**: Placeholder script that exits with code 1 (`echo "Error: no test specified" && exit 1`). No automated test runner (Jest, Vitest, Mocha) is currently configured.
- **Frontend `npm test`**: None configured.

### Strict Guardrails for Manual Test Scripts
The repository contains manual test scripts in `backend/` (`test-api.js`, `test-invoice-api.js`, `test-cloudinary.js`, `test-payment-msg91.js`, `test-warranty-msg91.js`) and `backend/scripts/` (`test-twilio.js`, `test-msg91.js`, `send-invoice.js`, etc.).
- **Live Side-Effect Warning**: These scripts trigger **real network and database actions**, including billable MSG91 WhatsApp messages, Twilio SMS/calls, Cloudinary media uploads, and database writes.
- **Agent Rule**: **Never execute manual test scripts blindly.** Inspect the target script's prerequisites, credentials, and potential side effects before running. Never run scripts that trigger live external messaging unless explicitly directed by the user in an isolated test environment.

### Offline vs. Online Verification
- Offline linting (`npm run lint` in `frontend/`) and static syntax checks can run without external dependencies.
- Backend runtime verification requires an active MongoDB connection.
- Messaging and storage verifications require valid MSG91, Twilio, and Cloudinary credentials.

---

## 4. Networking, API Flow & URLs

### Vite Proxy vs. Direct API Client
- **Current Behavior**:
  - `frontend/src/services/baseApi.js` configures `fetchBaseQuery` with an absolute base URL:
    - Production: `import.meta.env.VITE_PROD_API_URL` (`https://sale2service.onrender.com/v1`)
    - Development: `import.meta.env.VITE_LOCAL_API_URL` (`http://localhost:8000/v1`)
  - Because development requests use an **absolute URL**, the browser issues direct cross-origin HTTP requests to `http://localhost:8000`, which succeed via backend `cors()`.
  - The proxy in `frontend/vite.config.js` (`/v1` and `/api` $\rightarrow$ `http://localhost:8000`) serves as a fallback for relative `fetch` calls or direct browser paths.
- **Configuration Note**: Treat URLs like `https://sale2service.onrender.com` as current deployment configuration, not permanent immutable architecture. Always inspect `frontend/.env` and `baseApi.js` before modifying network configurations.

### Authentication Handshake
- JWT tokens are stored in `localStorage` (`sales_portal_token`) and synced to Redux `auth.accessToken`.
- Injected as `Authorization: Bearer <token>` on all protected RTK Query requests.
- `401 Unauthorized` responses in `baseQueryWithReauth` automatically clear state and dispatch Redux `logout()`.

---

## 5. Tenant Isolation Across All Database Access Patterns

Tenant scoping is WarrantyDesk's most critical data boundary. A cross-tenant leak is a severity-1 defect.

### 1. HTTP Request Context
- **Never trust client `shop_id`**: The frontend never supplies `shop_id` in request bodies or query parameters. The backend extracts `req.user.shopId` exclusively from the verified JWT in `middleware/auth.js`.
- **Query Scoping**: Every standard Mongoose query on tenant collections must explicitly scope by tenant and soft-delete status:
  ```javascript
  { shop_id: req.user.shopId, deleted_at: null }
  ```

### 2. Aggregation Pipelines
- In aggregation pipelines, the `$match` stage scoping `{ shop_id: req.user.shopId, deleted_at: null }` **must be the very first stage**.
- Never place `$lookup` or `$unwind` before the tenant `$match` stage. Slicing and filtering first prevents memory-intensive joins and cross-tenant data exposure.

### 3. Background Schedulers & Workers (No `req.user` Context)
- Background schedulers (`backend/scheduler/`) run out-of-band where `req` and `req.user` do not exist.
- Schedulers must explicitly iterate active shops (`Shop.find({ deleted_at: null })`) or operate on an explicitly passed `shopId`.
- Never execute global, unscoped queries across child collections (e.g. `ServiceVisit.find({ deleted_at: null })` without a `shop_id` filter).

### 4. Transactions & Sessions
- When running multi-document Mongoose transactions (e.g. in `inventoryService.js` or `invoiceSequenceService.js`), always pass `{ session }` to every query, update, and save operation.
- Ensure all queries within the transaction enforce the same tenant filter.

### 5. Denormalized Child Records
- `shop_id` is intentionally denormalized on child models (`ServiceSchedule`, `ServiceVisit`, `InvoiceItem`, `InventoryItem`). Always query child documents directly using `shop_id` instead of relying on multi-hop population through parent records.

---

## 6. Soft Deletion vs. Append-Only Collections

### 1. Soft-Deletable Core Entities
The following models implement `deleted_at: { type: Date, default: null }`:
- `Shop`, `User`, `Role`, `Customer`, `Invoice`, `InvoiceItem`, `InventoryItem`, `PurchaseOrder`, `Dealer`, `ServicePlan`, `ServiceSchedule`, `ServiceVisit`, `FestivalSchedule`, `ReminderRule`, `WhatsAppTemplate`.
- **Rules**:
  - Never execute `.deleteOne()`, `.deleteMany()`, or `.findByIdAndDelete()` on these collections in standard feature flows.
  - Soft delete: `doc.deleted_at = new Date(); await doc.save();`.
  - Always filter queries with `deleted_at: null`.
  - Permanent deletion is restricted to `/v1/recycle-bin/permanent` or `/empty` and requires verifying the shop's `delete_security_password`.

### 2. Append-Only & Operational Collections (No `deleted_at`)
The following models do **not** use soft deletion:
- `MessageLog`: Append-only audit trail of outbound WhatsApp messages and webhooks.
- `InventoryAuditLog`: Immutable history of inventory stock changes and intake.
- `InvoiceCounter`: Atomic counter tracking the daily sequence number per shop.
- **Rule**: Do not mechanically append `{ deleted_at: null }` to queries on these models.

---

## 7. Invoicing, Tax Calculations & Sequential Numbering

### 1. Authoritative Shared Calculation Contract
All invoice tax, deduction, and status calculations **must** use `shared/invoiceMath.js`.
- **GST Rate**: 18% standard GST (`GST_RATE_PERCENT = 18`).
  - Inclusive (`is_tax_inclusive !== false`): `subtotal = gross / 1.18`, `tax = gross - subtotal`.
  - Exclusive: `tax = subtotal * 0.18`, `total = subtotal + tax`.
- **Rounding**: All monetary values are rounded to 2 decimal places using `roundCurrency()`.
- **Deductions**: Subtracted in order (`discount` + `old_item_exchange_price`). Excess exchange generates `excess_exchange_credit`.
- **Payment Status**: Derived automatically (`PAID`, `PARTIAL`, `UNPAID`) based on `amount_paid` vs `total_amount`.
- **Rule**: Never duplicate tax, deduction, or balance calculations in component or controller files. Always import and use `shared/invoiceMath.js`.

### 2. Collision-Proof Sequential Numbering
- Pattern: `INV-{YYMMDD}-{sequence}` (e.g. `INV-260126-001`).
- Managed by `InvoiceSequenceService.generateAuthoritativeInvoiceNumber(shopId, invoiceDate, session)`:
  - Atomically increments `InvoiceCounter` (`{ shop_id: 1, date: 1 }` unique index).
  - Inspects existing active invoices for the day and fast-forwards the counter if it lags behind existing records.
  - Passes the Mongoose `session` to avoid race conditions during invoice creation transactions.
  - Retries up to 15 times before falling back to a timestamp suffix.

### 3. Regression Safeguards
Any edits to invoice creation, item pricing, or sequence generation must be regression-tested to verify that:
1. `shared/invoiceMath.js` outputs match expectations.
2. Concurrent invoice requests for the same shop on the same date produce unique, sequential numbers without E11000 duplicate key errors.

---

## 8. Authentication, Authorization & Secret Hygiene

### 1. Secret Hygiene
- **Never expose secrets**: Never log, echo in responses, or commit sensitive environment variables (`JWT_SECRET_KEY`, `CLOUDINARY_API_SECRET`, `MSG91_AUTHKEY`, `TWILIO_AUTH_TOKEN`, `delete_security_password`).
- **Sanitized Logging**: Ensure error handlers and webhook loggers do not print authorization headers or secret tokens to stdout or log files.

### 2. Authorization Boundaries
- Role hierarchy: `OWNER` $\rightarrow$ `ADMIN` $\rightarrow$ `STAFF`.
- `OWNER` role and users with `"all"` permissions bypass individual checks.
- Granular permissions are verified via `checkPermission("permission_name")`.
- **Strict Guardrail**: Never weaken or remove authorization middleware (`authenticate`, `authorize`, `checkPermission`) to make a feature work. If a permission error occurs, verify the role's permission set in the database rather than disabling the check.

### 3. Token Storage
- Tokens stored in `localStorage` under `sales_portal_token` is an observed design fact of this SPA. Agents must not treat this as an excuse to weaken XSS protections or expose tokens.
- Any change to authentication architecture or token storage requires an explicit security review.

---

## 9. Environment Variables & Precedence

### Variable Precedence in `backend/utils/validateEnv.js`
- **MongoDB URI**: `process.env.MONGODB_URI` takes precedence over `process.env.MONGO_URI`.
- **JWT Secret**: `process.env.JWT_SECRET_KEY` takes precedence over `process.env.JWT_SECRET`.
- **Startup Validation**: In production (`NODE_ENV === "production"` or `ENV === "prod"`), missing critical variables will cause `validateEnv()` to terminate the process (`process.exit(1)`).

### Environment Reference Table

| Variable | Tier | Purpose |
| :--- | :--- | :--- |
| `PORT` | Backend | Server port (`8000` local, dynamic on Render). Defaults to `5000` if unset. |
| `NODE_ENV` | Backend | Environment flag (`development` \| `production`). |
| `MONGODB_URI` / `MONGO_URI` | Backend | MongoDB connection string (local or Atlas). |
| `JWT_SECRET_KEY` | Backend | Secret string used to sign and verify JWT tokens. |
| `BACKEND_URL` | Backend | Public backend base URL for asset and PDF serving (e.g. `https://sale2service.onrender.com`). |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Backend | Cloudinary credentials for PDF, bill, and logo storage. |
| `MSG91_AUTHKEY`, `MSG91_API_ENDPOINT`, `MSG91_NUMBER`, `MSG91_NAMESPACE` | Backend | MSG91 WhatsApp outbound template messaging. |
| `MSG91_WEBHOOK_TOKEN` | Backend | Authentication token for MSG91 webhook delivery reports. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` | Backend | Twilio WhatsApp configuration. |
| `VITE_ENVIRONMENT` | Frontend | Environment mode (`local` \| `production`). |
| `VITE_LOCAL_API_URL` | Frontend | Local backend API base (`http://localhost:8000/v1`). |
| `VITE_PROD_API_URL` | Frontend | Production backend API base (`https://sale2service.onrender.com/v1`). |

---

## 10. File Preservation & Maintenance Rules

1. **Preserve User Data & Configs**: Do not delete untracked user data dumps (`Contacts_*.csv`, `Cleaned_Contacts_V2.csv`, `*.vcf`), developer settings (`.vscode/`), or stray tooling directories (`~/.continue/`).
2. **Controlled Cleanup**: File deletion or cleanup is permitted only when explicitly requested by the user and after inspecting the affected files to confirm no critical data or state is lost.
3. **No Mass Assignment**: On update endpoints, whitelist editable fields explicitly. Never execute `Object.assign(doc, req.body)`.
4. **Phone Normalization**: Customer phone numbers are normalized in Mongoose hooks to 10 digits. Compound unique index: `{ whatsapp_number: 1, shop_id: 1, deleted_at: 1 }`.
5. **Inventory Auditing**: Every status change on `InventoryItem` (`IN_STOCK`, `SOLD`, `RETURNED`, `UNDER_SERVICE`, `DEFECTIVE_RMA`) must write an entry to `InventoryAuditLog`.
