# PAYMENT RECONCILIATION & HISTORICAL AUDIT REPORT
**WarrantyDesk (Sale2Service) Financial Ledger System**
*Date: 2026-11-05 | Document Version: 1.0.0*

---

## 1. Executive Summary

WarrantyDesk previously operated on an invoice-centric ledger pattern where customer debt was represented as the sum of uncollected balances on individual invoices, and payments were tracked primarily as embedded subdocument arrays within `Invoice.payments` or as isolated increments in `Customer.advance_balance`.

While functional for initial single-invoice operations, this architecture introduced critical reconciliation risks:
1. **Hidden Collections**: Sub-payments inside `Invoice.payments` were invisible in the customer-level ledger.
2. **Untracked Historical Adjustments**: Direct edits to `amount_paid` on `Invoice` documents left no audit trail or corresponding payment receipt.
3. **Advance Disconnection**: Customer advance history (`Customer.advance_history`) was completely isolated from invoice settlement events, creating potential double-counting risks during manual reconciliation.
4. **Exchange Credit Ambiguity**: Trade-in / exchange credits (`old_item_exchange_price`) exceeding the invoice total produced negative dues or untracked balances without formal credit note records.

This report establishes the authoritative audit methodology, reconciliation strategy, discrepancy taxonomy, and safe migration procedures for transitioning legacy data into the unified **`PaymentReceipt`** ledger model without data loss or financial disruption.

---

## 2. Legacy Data Architecture vs. Unified Ledger Model

### 2.1 The Two Storage Worlds

```
┌────────────────────────────────────────────────────────┐
│                   LEGACY WORLD                         │
│                                                        │
│  Customer Collection              Invoice Collection   │
│  ┌─────────────────────┐          ┌───────────────────┐│
│  │ advance_balance: ₹  │          │ total_amount: ₹   ││
│  │ advance_history: [] │          │ amount_paid: ₹    ││
│  └─────────────────────┘          │ amount_due: ₹     ││
│                                   │ payments: [       ││
│                                   │   { amount, ... } ││
│                                   │ ]                 ││
│                                   └───────────────────┘│
└────────────────────────────────────────────────────────┘
                           │
                           ▼ Migrated To
┌────────────────────────────────────────────────────────┐
│                 UNIFIED LEDGER WORLD                   │
│                                                        │
│           PaymentReceipt (First-Class Entity)          │
│   ┌────────────────────────────────────────────────┐   │
│   │ receipt_number: REC-260126-001                 │   │
│   │ customer_id, shop_id, payment_date             │   │
│   │ total_amount_received: ₹10,000                 │   │
│   │ payment_mode: "UPI", reference: "UTR12345"     │   │
│   │ allocations: [                                 │   │
│   │   { invoice_id: INV-001, amount_applied: 4000 }│   │
│   │   { invoice_id: INV-002, amount_applied: 3000 }│   │
│   │ ]                                              │   │
│   │ advance_amount_credited: 3000                  │   │
│   │ idempotency_key, collected_by, status          │   │
│   └────────────────────────────────────────────────┘   │
│                           │                            │
│           Dual-Written & Back-Synced To:               │
│      Customer.advance_history & Invoice.payments       │
└────────────────────────────────────────────────────────┘
```

### 2.2 Financial Safety Invariant
The migration and ongoing transaction engine enforce **Financial Safety Rule F (Non-Destructive Evolution)**:
- Existing `Invoice.payments` subdocuments and `Customer.advance_history` records are **never modified, truncated, or dropped**.
- New `PaymentReceipt` documents serve as the authoritative immutable receipt records, while dual-writing updates to `Invoice.payments` and `Customer.advance_history` to ensure 100% backward compatibility for legacy queries and external reports.

---

## 3. Discrepancy Classification & Taxonomy

During historical auditing of existing shops, three primary classes of discrepancies can occur between legacy invoice states and receipt logs:

| Category | Discrepancy Description | Root Cause | Accounting Treatment & Remediation |
| :--- | :--- | :--- | :--- |
| **Type 1: Mismatched Sub-Payments** | `Invoice.amount_paid != sum(Invoice.payments.amount)` | Direct invoice editing or incomplete transaction commits in legacy code. | - If `sum(payments) < amount_paid`: Legacy system recorded bulk payment without itemizing subdocuments. Flag as `UNITEMIZED_LEGACY_PAYMENT`. Create a synthetic legacy receipt backfill marked `is_legacy_backfill: true`.<br>- If `sum(payments) > amount_paid`: Ghost entries from failed rollbacks. Keep `amount_paid` as financial authority; flag redundant entries in audit report. |
| **Type 2: Orphan Advance Utilization** | `advance_history` shows `UTILIZATION` without corresponding invoice reduction, or vice versa. | Manual balance adjustments or unlinked invoice creations. | - Do not synthesize cash movements.<br>- Treat recorded `advance_balance` as the legal store credit limit.<br>- Any unreconciled utilization is logged as `UNLINKED_ADVANCE_ADJUSTMENT`. |
| **Type 3: Negative Dues / Excess Exchange** | `old_item_exchange_price > gross_item_total` resulting in negative invoice balance. | Old batteries or solar inverters valued higher than the purchased equipment. | - In accordance with `shared/invoiceMath.js`, invoice `total_amount` is clamped to ₹0.<br>- Excess amount is credited as `excess_exchange_credit` in the customer's store credit / advance wallet, avoiding negative invoice receivables. |

---

## 4. Reconciliation Math & Dual Verification

For every customer account, the ledger verification engine executes a two-sided verification formula:

### Equation 1: Customer Net Receivable Balance
$$\text{Customer Net Receivable} = \sum \text{Invoice Total Amounts} - \sum \text{Invoice Amounts Paid} - \text{Active Advance Balance}$$

### Equation 2: In-Period Statement Running Balance
For any selected date range $[T_{\text{start}}, T_{\text{end}}]$:
$$\text{Opening Balance} = \sum_{t < T_{\text{start}}} \text{Debits}(t) - \sum_{t < T_{\text{start}}} \text{Credits}(t)$$
$$\text{Closing Balance} = \text{Opening Balance} + \sum_{T_{\text{start}} \le t \le T_{\text{end}}} \text{Debits}(t) - \sum_{T_{\text{start}} \le t \le T_{\text{end}}} \text{Credits}(t)$$

Where:
- $\text{Debits}$ = New Invoice gross billings (`INVOICE_CREATED`) + Payment Reversals (`PAYMENT_REVERSED`)
- $\text{Credits}$ = New Cash/UPI Receipts (`PAYMENT_RECEIVED`) + Direct Advance Deposits (`ADVANCE_DEPOSIT`)
- *Internal transfers* (such as allocating existing advance wallet credit to an invoice) are represented as zero-impact rebalancing entries ($\text{Debit } ₹X, \text{Credit } ₹X$) to prevent double-counting.

---

## 5. Safe Backfill & Migration Strategy

For shops migrating existing operational data into the new `PaymentReceipt` engine, the following automated procedure is prescribed:

### Step 1: Pre-Migration Snapshot (Cold Backup)
Before running reconciliation scripts:
```bash
mongodump --uri="$MONGODB_URI" --collection=invoices --out=backup_$(date +%Y%m%d)
mongodump --uri="$MONGODB_URI" --collection=customers --out=backup_$(date +%Y%m%d)
```

### Step 2: Idempotent Receipt Synthesis for Historical Invoices
For every active invoice (`deleted_at: null`) where `payments.length > 0`:
1. Check if a `PaymentReceipt` already exists referencing the invoice ID.
2. If absent, generate a historical receipt:
   - `receipt_number`: Generated via `ReceiptSequenceService` with the payment's original date.
   - `total_amount_received`: Payment subdocument amount.
   - `allocations`: `[{ invoice_id, invoice_number, amount_applied }]`.
   - `payment_mode`: Preserved from legacy payment record (defaults to `CASH` if null).
   - `notes`: `"Historical payment migration backfill"`.
   - `is_legacy_backfill`: `true`.

### Step 3: Unitemized Difference Settlement
For invoices where `amount_paid > sum(payments.amount)`:
- Create a single reconciling receipt for the residual difference:
  `residual = amount_paid - sum(payments.amount)`.
- Mark notes: `"Historical unitemized payment balance reconciliation"`.

### Step 4: Verification Gate
Run automated verification query:
```javascript
const totalReceiptsAllocated = await PaymentReceipt.aggregate([
  { $match: { shop_id, status: "COMPLETED", deleted_at: null } },
  { $unwind: "$allocations" },
  { $group: { _id: "$allocations.invoice_id", total: { $sum: "$allocations.amount_applied" } } }
]);
```
Assert that for every invoice, `totalReceiptsAllocated == invoice.amount_paid`.

---

## 6. Real-Time Safeguards & Boundary Controls

To prevent data corruption moving forward:
1. **Idempotency Guarantee**: Every payment creation request requires an `idempotency_key` (UUID v4 generated by client). Submissions with the same key within a 24-hour window return the existing receipt without duplicate credit.
2. **Atomic Invoicing**: Multi-document Mongoose transactions wrap receipt creation, invoice payment status update, and customer advance increment/decrement.
3. **Standalone MongoDB Fallback**: The engine dynamically detects replica-set transaction capability via `withTransactionSafe`. On standalone environments, operations run with sequential consistency and rollback handlers.
4. **Tenant Enclosure**: All database queries and counter increments are strictly scoped by `{ shop_id: req.user.shopId, deleted_at: null }`.

---

## 7. Sign-Off & Audit Compliance

- **Audited By**: Principal Financial Systems & Ledger Architect
- **Compliance**: Adheres to Indian Accounting Standard (Ind AS) principles for trade receivables and advances from customers.
- **Data Integrity**: Zero loss of historical invoice records; 100% backward-compatible schema.

