# Customer Ledger-Based Consolidated WhatsApp Payment Reminder System

**WarrantyDesk (Sale2Service)**  
*Architecture, Specifications, State Tracking & Automated Verification Report*

---

## 1. Executive Summary

Previously, WarrantyDesk operated an invoice-wise reminder scheduler (`PaymentReminderScheduler.js`) that dispatched individual WhatsApp messages for every unpaid or partially paid invoice. A single customer with multiple pending bills (for example, four invoices of ₹2,000, ₹3,000, ₹4,000, and ₹1,500) would receive four separate WhatsApp notifications in a single day, causing spam, confusion, and high messaging costs.

This release replaces the invoice-wise dispatch mechanism with an authoritative, **Customer Ledger-based Consolidated WhatsApp Payment Reminder System**. 

The new architecture evaluates each customer's complete account across all active invoices, groups them into **Upcoming Payments** and **Overdue Payments**, enforces strict **7-day overdue spacing** and **3-day upcoming lead time** rules, and dispatches a single consolidated message per customer using approved Meta/MSG91 WhatsApp templates in Hindi (`hi`).

---

## 2. Core Architectural Principles & Transitions

| Dimension | Legacy Behavior (Invoice-Wise) | New Behavior (Customer-Level Consolidated) |
| :--- | :--- | :--- |
| **Granularity** | Per-invoice dispatch (`Invoice.find(...)`) | Per-customer account evaluation (`Customer` + `Invoice` ledger) |
| **Message Volume** | $N$ messages for $N$ unpaid invoices | Maximum **1 message per eligible customer per day** |
| **Customer Dues** | Isolated invoice amount due | Authoritative total overdue or upcoming balance |
| **Overdue Cadence** | Alternate days (`daysOverdue % 2 !== 0`) without initial grace | **7-day initial delay** from oldest due date, then **every 7 local calendar days** |
| **Upcoming Timing** | Inflexible day offsets (`[0, 3, 7, 15]`) | **3 calendar days** before the nearest upcoming due date |
| **Coordination** | Uncoordinated (multiple messages sent concurrently) | **Overdue prioritized**; Upcoming deferred on the same day |
| **State Tracking** | Ephemeral 72-hour `isReminderAlreadySent` lock | Persistent `CustomerPaymentReminderState` tracking cycles and next eligibility |
| **Approved Templates** | `payment_reminders` / `payment_missed` (deprecated) | `payment_upcoming_hiindi` / `payment_overdue_hi` (language: `hi`) |

---

## 3. Approved Meta WhatsApp Templates & Parameter Contracts

Both templates are registered and approved in Hindi (`hi`) on MSG91 / Meta WhatsApp Business API:

### 3.1 Upcoming Reminder Template: `payment_upcoming_hiindi`

- **Language Code**: `hi`
- **Trigger**: Earliest upcoming invoice is within $\le 3$ calendar days of due date.
- **Components Mapping (6 parameters)**:

| Parameter | Variable | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `{{1}}` | Customer Name | `राहुल वर्मा` | Full name or first name with fallback |
| `{{2}}` | Unpaid Invoice Count | `2` | Number of unpaid upcoming invoices |
| `{{3}}` | Outstanding Amount | `5,000` | Sum of dues formatted in Indian numbering without `₹` |
| `{{4}}` | Next Due Date | `18/11/2026` | Nearest due date formatted as `DD/MM/YYYY` |
| `{{5}}` | Shop Contact | `9876543210` | Normalized shop contact number |
| `{{6}}` | Shop Display Name | `स्मार्ट सोलर & बैटरीज` | Hindi shop name (fallback: English shop name) |

### 3.2 Overdue Reminder Template: `payment_overdue_hi`

- **Language Code**: `hi`
- **Trigger**: Oldest overdue invoice is $\ge 7$ calendar days past due date, and at least 7 days have elapsed since last overdue reminder.
- **Components Mapping (6 parameters)**:

| Parameter | Variable | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `{{1}}` | Customer Name | `राहुल वर्मा` | Full name or first name with fallback |
| `{{2}}` | Overdue Invoice Count | `4` | Number of overdue invoices |
| `{{3}}` | Total Overdue Amount | `10,500` | Sum of overdue dues formatted in Indian numbering without `₹` |
| `{{4}}` | Oldest Due Date | `01/11/2026` | Oldest due date formatted as `DD/MM/YYYY` |
| `{{5}}` | Shop Contact | `9876543210` | Normalized shop contact number |
| `{{6}}` | Shop Display Name | `स्मार्ट सोलर & बैटरीज` | Hindi shop name (fallback: English shop name) |

---

## 4. Business Logic & Scheduling Rules

```
                      [9:00 AM IST Cron / Manual Trigger]
                                      │
                                      ▼
                        Fetch Active Shop & Timezone
                                      │
                                      ▼
                      Fetch Customer's Active Invoices
                   (UNPAID / PARTIAL, deleted_at: null)
                                      │
                                      ▼
                       Calculate Invoice Dues & Reconcile
              (gross - paid - excess_exchange_credit)
                                      │
                                      ▼
                     Classify in Local Shop Timezone:
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
          Overdue Invoices                     Upcoming Invoices
      (due_date < today_local)             (due_date >= today_local)
                    │                                   │
                    ▼                                   ▼
        Days Since Oldest Due                 Days Until Nearest Due
                    │                                   │
        ┌───────────┴───────────┐           ┌───────────┴───────────┐
        ▼                       ▼           ▼                       ▼
     < 7 Days               >= 7 Days    > 3 Days                <= 3 Days
     (Ineligible)           (Eligible)   (Ineligible)            (Eligible)
                                │                                   │
                                └───────────────┬───────────────────┘
                                                ▼
                                    Customer Coordination Rule:
                                  Both Overdue & Upcoming eligible?
                                                │
                                ┌───────────────┴───────────────┐
                                ▼                               ▼
                               Yes                              No
                     (Send Overdue ONLY;              (Send Single Eligible
                      Defer Upcoming)                       Reminder)
                                │                               │
                                └───────────────┬───────────────┘
                                                ▼
                                   Verify 7-Day Spacing
                               (today >= next_eligible_date)
                                                │
                                ┌───────────────┴───────────────┐
                                ▼                               ▼
                               Yes                              No
                        Dispatch MSG91                 Skip / Defer Run
                     Advance next_eligible_date
                     Dual-Log in ReminderLog & State
```

### 4.1 Overdue 7-Day Rules
1. **Initial Overdue Grace Period**: No overdue reminder is sent during the first 6 days after an invoice's due date. The earliest an initial overdue reminder can be dispatched is on day 7 after the oldest due date (`daysSinceOldestDue >= 7`).
2. **7-Day Recurring Spacing**: When an overdue reminder is dispatched, `next_eligible_date` is advanced to `today + 7 calendar days`. Any daily scheduler run occurring between Day 1 and Day 6 is automatically suppressed.
3. **Automatic Settlement**: When the customer clears all overdue dues (`overdueCount === 0` or `totalOverdue <= 0`), the overdue state transitions to `cycle_status: "SETTLED"` and no further overdue reminders are generated.

### 4.2 Upcoming 3-Day Lead Window Rules
1. **Lead Time Window**: Upcoming payment reminders are evaluated only when the nearest due date is within $0 \le \text{daysUntilDue} \le 3$ calendar days.
2. **Daily Throttle**: An upcoming reminder is sent at most once per day, and once per nearest due date cycle.

### 4.3 Same-Day Coordination Rule
If a customer has **both** overdue invoices ($\ge 7$ days overdue) and upcoming invoices ($\le 3$ days until due):
- The system prioritizes the **Overdue Reminder** (`payment_overdue_hi`).
- The **Upcoming Reminder is deferred** to prevent sending two separate reminders to the same customer on the same day.

---

## 5. Data Models & State Persistence

### 5.1 `CustomerPaymentReminderState` (`backend/models/CustomerPaymentReminderState.js`)
Tracks the active cycle, dispatch timestamps, and next eligibility dates:
```javascript
{
  shop_id: ObjectId,                   // Scoped per tenant
  customer_id: ObjectId,               // Scoped per customer
  reminder_category: "OVERDUE" | "UPCOMING",
  cycle_id: String,                    // Unique ID per debt cycle
  cycle_status: "ACTIVE" | "SETTLED",
  first_eligibility_date: Date,
  last_sent_at: Date,
  next_eligible_date: Date,           // e.g. last_sent_at + 7 days
  last_invoice_count: Number,
  last_outstanding_amount: Number,
  last_reference_due_date: Date,
  total_reminders_sent: Number,
  last_provider_message_id: String,
  deleted_at: Date,
}
```
**Index**: `{ shop_id: 1, customer_id: 1, reminder_category: 1, deleted_at: 1 }` (unique).

### 5.2 Enhanced `ReminderLog` (`backend/models/ReminderLog.js`)
Dual-writes customer reminder audit logs with structured metadata:
- `entity_type: "CUSTOMER"`
- `entity_id: customer._id.toString()`
- `customer_id: customer._id`
- `reminder_category: "OVERDUE" | "UPCOMING"`
- `invoice_count: Number`
- `outstanding_amount: Number`
- `due_date: Date`
- `invoice_ids: [ObjectId]`

---

## 6. Implementation Components

1. **`backend/services/paymentReminderService.js`**:
   - Universal engine containing pure calculation utilities (`getLocalDateString`, `getDayDifference`, `formatAmountWithoutCurrency`, `formatDateDMY`, `calculateInvoiceDue`, `classifyCustomerInvoices`).
   - `PaymentReminderService.evaluateCustomerReminder`: Evaluates dues, eligibility rules, and coordination logic.
   - `PaymentReminderService.sendCustomerPaymentReminder`: Orchestrates approved template variable mapping, MSG91 delivery, `ReminderLog` creation, and `CustomerPaymentReminderState` updates.
   - `PaymentReminderService.processAllPaymentReminders`: Processes all shops and customers on the daily 9:00 AM IST schedule.
2. **`backend/scheduler/reminders/PaymentReminderScheduler.js`**:
   - Stripped of obsolete invoice-wise loops (`processDueDateReminders`, `processOverdueReminders`).
   - Delegates to `PaymentReminderService.processAllPaymentReminders(targetDate)`.
   - Sends daily consolidated summaries to shop owners using template `daily_payment_summary`.
3. **`backend/controllers/invoiceController.js` & `customerController.js`**:
   - `POST /v1/invoices/:id/send-payment-reminder`: Updated to dispatch consolidated customer reminder instead of single invoice reminder.
   - `POST /v1/customers/:id/send-payment-reminder`: New dedicated endpoint for manual customer reminder dispatch with permission `customers_edit`.
4. **`frontend/src/pages/customers/CustomerView.jsx`**:
   - Integrated "Send Reminder" button with `Bell` icon in the page header actions, enabled when customer has outstanding dues.
   - Dispatches `useSendCustomerPaymentReminderMutation` with instant toast feedback.

---

## 7. Verification & Automated Test Suite

### 7.1 Automated Test Execution Summary
The test suite in `backend/tests/payment-reminder-scheduler.test.js` covers:
- **Consolidated 4-bill calculation**: 4 invoices totaling ₹10,500 evaluated into 1 consolidated payload.
- **Overdue 7-day rule**: Rejection on Days 1–6, eligibility on Day 7, oldest due date reference.
- **Upcoming 3-day lead window**: Rejection on Day 4, eligibility on Days 0–3, nearest due date reference.
- **Coordination rule**: Overdue priority over upcoming on the same day.
- **Currency formatting**: Exact Indian numbering format without currency signs (`10,500`, `10,500.50`).
- **Date formatting**: `DD/MM/YYYY` in local timezone (`Asia/Kolkata`).
- **Partial payment & settlement**: Immediate deduction of partial payments, exclusion of paid invoices, and settling of debt cycles.
- **Cadence interval arithmetic**: Strict enforcement of 7-day spacing between reminders.

```
TAP version 13
# tests 40
# suites 0
# pass 40
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2679.5905
```

### 7.2 Frontend Lint & Production Build
- `npx eslint frontend/src/pages/customers/CustomerView.jsx frontend/src/features/customers/customerApi.js`: **0 errors, 0 warnings**.
- `npm --prefix frontend run build`: **Vite v7.3.1 build succeeded in 28.33s**, generating production bundle in `dist/`.

