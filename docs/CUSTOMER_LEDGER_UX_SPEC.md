# Customer Ledger & Payment UX/UI Specification
**Author**: Senior React UI/UX Architect  
**Project**: WarrantyDesk (Sale2Service)  
**Status**: Approved UX Specification & Design System Contract

---

## 1. UX Design Philosophy & Indian Retail Shop Persona

### Target Users:
Indian electronics, battery, and solar shop owners and counter staff.
- **Constraints**: High footfall, noisy environment, frequent mobile phone usage (PWA), varying degrees of tech literacy.
- **Principles**:
  1. **Zero Guesswork**: Numbers must be unambiguous. Outstanding dues are bold and amber/red; credits and collected amounts are emerald/indigo.
  2. **Touch-First & Zero Horizontal Scroll**: All table data wraps cleanly on mobile viewports (< 640px) as structured, high-density cards.
  3. **Universal Payment Touchpoint**: The payment dialog behaves identically whether triggered from the Customer screen, Customer list, Invoice screen, or Invoice list.
  4. **No Financial Jargon**: Use familiar terms: "Billed" instead of "Accounts Receivable", "Paid" instead of "Credit Ledger Entry", "Store Credit / Advance" instead of "Liability Wallet".

---

## 2. Customer Account Screen Structure (`CustomerView.jsx`)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Customers        CUSTOMER ACCOUNT & LEDGER                                 │
│  [Receive Payment]  [Download / Share Statement]  [+ Create Invoice]  [✏️ Edit]        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  👤 Ramesh Kumar  |  Retail Customer  |  ID: #67298abc                                 │
│  📱 +91 98765 43210  [WhatsApp] [Call]  |  GSTIN: 27AABCV1234F1Z8                     │
│  📍 123 Station Road, Kurla West, Mumbai - 400070                                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [FINANCIAL SUMMARY CARDS (4 Cards Grid)]:                                             │
│  ┌──────────────────┐┌──────────────────┐┌──────────────────┐┌──────────────────────┐  │
│  │ Total Outstanding││ Overdue Amount   ││ Available Advance││ Last Payment         │  │
│  │ ₹4,500           ││ ₹2,000 (14d)     ││ ₹500             ││ ₹3,000 on 28 Oct     │  │
│  └──────────────────┘└──────────────────┘└──────────────────┘└──────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [TABS NAVIGATION]:                                                                    │
│  [ All Activity (12) ] [ Invoices (8) ] [ Payments (6) ] [ Advance (3) ] [ Statement ]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│  TAB CONTENT AREA:                                                                     │
│  (Displays contextual view corresponding to active tab)                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tab Navigation Breakdown

### Tab 1 — All Activity (Unified Feed)
- **Purpose**: Fast chronological glance at everything that happened on this customer's account.
- **Format**: Feed cards showing event icon, date, reference, description, amount, and badge.
  - 📄 *Invoice INV-261015-001 issued for Exide Battery (₹10,000)*
  - 💵 *Payment REC-261020-001 received via UPI (₹6,000)*
  - 💳 *Advance wallet used on INV-261028-002 (₹1,500)*

### Tab 2 — Invoices
- **Purpose**: Direct invoice management.
- **Data Columns**:
  - `Invoice #` (clickable link)
  - `Invoice Date`
  - `Total Amount`
  - `Amount Settled`
  - `Remaining Due`
  - `Due Date` & Overdue warning
  - `Status` badge (`PAID`, `PARTIAL`, `UNPAID`)
  - `Quick Pay` button (opens payment modal pre-filled for this invoice)

### Tab 3 — Payments (Receipt History)
- **Purpose**: Transparent audit of all payments received from this customer.
- **Data Columns**:
  - `Receipt #` (e.g. `REC-261105-001`)
  - `Payment Date`
  - `Amount Received`
  - `Mode` (Cash, UPI with UTR #, Card, Cheque)
  - `Allocated Across` (e.g. *"₹4,000 to INV-001, ₹1,000 to Advance"*)
  - `Collected By` (Staff Name)
  - `Status` (`COMPLETED`, `REVERSED`)
  - `Actions`: Share Receipt (WhatsApp), Reversal (with permission)

### Tab 4 — Advances (Store Credit / Wallet History)
- **Purpose**: Tracks every rupee deposited into or spent from customer's advance balance.
- **Summary Header**: Available Advance Balance, Total Deposited, Total Utilized.
- **Table / Cards**:
  - `Date`
  - `Type` (Deposit `CREDIT` vs Deduction `DEBIT`)
  - `Amount`
  - `Payment Mode`
  - `Purpose / Invoice Reference`
  - `Recorded By`

### Tab 5 — Account Statement (Printable Ledger)
- **Purpose**: Formal ledger for accounting, tax verification, and customer statement printing.
- **Header Controls**: Date Range Picker (`From Date` to `To Date`), Print Statement button, Share PDF on WhatsApp.
- **Ledger Summary Row**: Opening Balance: ₹X | Total Debits: ₹Y | Total Credits: ₹Z | Closing Balance: ₹W.
- **Table Columns**:
  - `Date`
  - `Reference No` (Invoice # or Receipt #)
  - `Description`
  - `Debit (Billed +)`
  - `Credit (Paid -)`
  - `Running Balance`

---

## 4. Universal Receive Payment Modal Flow

A single, cohesive modal component (`UniversalPaymentModal.jsx`) servicing all 4 entry points:

### Step 1: Purpose Selection
- **Option 1: Settle Invoices & Dues** (Default when dues exist)
  - Sub-toggle: **Auto FIFO Allocation** (recommended, oldest first) vs **Manual Selection** (user checks specific invoices and edits allocated amounts).
- **Option 2: Add Advance Deposit** (Default when customer has zero pending dues).

### Step 2: Payment Details
- `Amount (₹)` (Auto-fills with outstanding dues; quick buttons for `+₹500`, `+₹1,000`, `Full Due`).
- `Payment Mode`: Cash, UPI, Card, Bank Transfer, Cheque.
- `Transaction Reference`: Conditional field (e.g. "Enter UPI UTR" or "Cheque Number").
- `Payment Date`: Date picker (defaults to today).
- `Notes`: Optional comments.
- `Send WhatsApp Receipt`: Toggle switch (defaults to ON).

### Step 3: Live Real-Time Distribution Preview
Before clicking submit, the modal displays:
```
┌────────────────────────────────────────────────────────────┐
│ Payment Summary Preview                                    │
│ • Total Received:                  ₹6,000                  │
│ • Applied to INV-261015-001:       ₹4,000  (Fully Paid)    │
│ • Applied to INV-261028-002:       ₹1,500  (Partial Paid)  │
│ • Excess to Customer Advance:      ₹500    (Store Credit)  │
│ ────────────────────────────────────────────────────────── │
│ Customer Balance After Payment:    ₹0 Dues (₹500 Advance)  │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Invoice Details (`InvoiceView.jsx`) Enhancements

Directly beneath the Invoice Line Items table, add a dedicated **Payment History Card**:
- Table of all payments applied to this specific invoice.
- Displays: Receipt #, Date, Allocated Amount, Total Receipt Amount (if split across multiple invoices), Mode, Reference #, Collected By, and Notes.
- If invoice has zero payments, shows clean empty state: *"No payments recorded yet. Click 'Record Payment' to record first installment."*

