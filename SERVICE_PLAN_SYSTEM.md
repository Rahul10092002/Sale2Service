# Service Plan System - Invoice / Scheduler Documentation

## 1. Overview

This document explains how service plans are created and managed in the `sale@service` codebase, with focus on invoice creation flow, API routes, scheduler behavior, and model schemas.

### Core components
- `Invoice` (high-level sale record)
- `InvoiceItem` (product + warranty line item)
- `ServicePlan` (cycle service schedule settings)
- `ServiceSchedule` (specific dates & reminder statuses)
- `InvoiceController` (API request handling)
- `ServiceReminderScheduler` (reminder generation and dispatch)

---

## 2. Service Plan Creation in Invoice Flow

### Invoice creation endpoint
- Route: `POST /v1/invoices/` (in `routes/invoice.js`)
- Controller: `InvoiceController.createInvoice()`
- Guard: `authenticate` + `authorize("OWNER", "ADMIN", "STAFF")`

### Step-by-step creation process
1. Start MongoDB transaction (`session.startTransaction()`)
2. Validate payload: `customer`, `invoice`, `invoice_items`
3. Resolve / create `Customer`
4. Generate unique `invoice_number` and compute totals (subtotal, tax, total_amount, due, payment status)
5. Create `Invoice` document in DB
6. For each `invoice_item`:
   - compute warranty dates
   - create `InvoiceItem` in DB
   - if `item.service_plan_enabled && item.service_plan`:
     - normalize `totalServices` (positive int, fallback 1)
     - set `serviceStart` = provided date or now
     - `serviceEnd = this.computeServiceEndDate(...)`
     - create `ServicePlan`:
       - `invoice_item_id`, `shop_id`
       - `service_interval_type`, `service_interval_value`, `total_services`, `service_start_date`, `service_end_date`
       - `service_description`, `service_charge`, `is_active` (default true), `created_by`
     - Save `ServicePlan` in current session
     - Call `this.generateServiceSchedules(servicePlan, session)` to create schedule entries
7. Commit transaction
8. Generate and upload invoice PDF (out-of-transaction for non-fatal path)
9. Respond to client
10. Fire asynchronous WhatsApp notification (`invoice_created`) with PDF link

### update flow (similar)
- `InvoiceController.updateInvoice()` deletes and re-creates invoice items and service plans, then re-generates schedule for service plans.
- Ensures full sync with modified service plan data after invoice edits.

---

## 3. API Routes (Service plan related)

Routes in `backend/routes/invoice.js`:

1. `GET /:invoiceId/items/:itemId/services`
   - Returns service history +/- plan schedule for item.
   - Controller method: `getInvoiceItemServices()`
   - Usage: product detail view, service logs.

2. `POST /items/:itemId/services`
   - Creates a plan for invoice item outside of invoice creation.
   - Controller method: `createServiceForProduct()`

3. `PUT /items/:itemId/services/charges`
   - Adjusts service charge values on plan.
   - Controller method: `updateServicePlanCharges()`

4. `PUT /items/:itemId/services`
   - Full service plan updates (interval, start date, count, etc.) with schedule regeneration.
   - Controller method: `updateServicePlan()`
   - Behaviors:
     - Validates item + authorization
     - Finds existing ServicePlan and updates
     - Keeps `COMPLETED`, deletes and recreates `PENDING`, `MISSED`, `RESCHEDULED`

---

## 4. Core Logic Breakdown

### `computeServiceEndDate()` (in `InvoiceController`)
- Inputs:
  - `serviceStartDate`
  - `intervalType` (`MONTHLY`, `QUARTERLY`, `HALF_YEARLY`, `YEARLY`, `CUSTOM`)
  - `intervalValue` (number)
  - `totalServices` (number)
- Returns a computed end date for the final service using interval spacing and count.
- Typical formula: `serviceStartDate + (totalServices - 1) * intervalDuration`

### `generateServiceSchedules(servicePlan, session)`
- Generates N schedules where N = `servicePlan.total_services`
- For each serial number from 1..N:
  - compute date = `servicePlan.service_start_date + (n-1)*(intervalValue * intervalUnit)`
  - create `ServiceSchedule` with `scheduled_date`, `original_date`, `service_number`, `status: PENDING`, `service_charge`, etc.
- sets Binders:
  - `service_plan_id`, 
  - maybe `invoice_item_id` via plan lookup,
  - `shop_id`.
- Persists all schedules in same `session`.

### Validation assumptions
- `total_services` fallback to 1 when missing or invalid.
- `service_charge` fallback 0.
- `is_active` defaults true unless explicitly false.
- `item.service_plan` must exist to create plan.
- compute date consistency is assumed based on interval type and value.

---

## 5. Scheduler System Design (high-level)

### Service reminder scheduler path
Built in `backend/scheduler/reminders/ServiceReminderScheduler.js`:
1. `processUpcomingServices()`
   - finds schedules due in 3 days / 1 day using IST date ranges (`createDateRange`)
   - `sendUpcomingServiceReminder(service, forceResend)` for each
2. `processMissedServices()`
   - finds pending items with `scheduled_date < todayISTStart`
   - calls `sendMissedServiceReminder()` and updates status
3. Dedup mechanisms and already sent checks probably via `isReminderAlreadySent()` in `BaseScheduler`
4. `processServiceReminders()` contains entrypoint.

### Reminder dispatch
- Uses `MessageSender.sendTemplateMessage(...)` with template variables.
- Uses shop name via `getShopName(shop)`.
- Resilient to invalid phone checks.

### Background job schedule
- Cron/BG worker likely in `backend/scheduler/index.js` and invoked as Node process by external task runner.
- Must run daily.

### Missed service handling
- `PENDING` schedules with due date passed are flagged missed.
- Scheduler likely moves to `MISSED` and sends missed service notification.
- `ServicePlan` update can re-create future pending entries only.

---

## 6. Models and Schema (detailed)

### Invoice model (`models/Invoice.js`)
```js
Invoice {
  invoice_number: String (required, unique shop+number),
  invoice_date: Date,
  customer_id: ObjectId(Customer),
  shop_id: ObjectId(Shop),
  payment_status: [PAID, PARTIAL, UNPAID],
  payment_mode: [CASH, UPI, CARD, BANK_TRANSFER, MIXED, CREDIT],
  subtotal: Number,
  discount: Number,
  tax: Number,
  amount_paid: Number,
  amount_due: Number,
  total_amount: Number,
  due_date: Date,
  created_by: ObjectId(User),
  invoice_pdf, pdf_public_id, notes, deleted_at,
  timestamps true,
  virtual: invoice_items (populate InvoiceItem)
}
```

### InvoiceItem model (`models/InvoiceItem.js`)
```js
InvoiceItem {
  invoice_id: ObjectId(Invoice),
  shop_id: ObjectId(Shop),
  serial_number: String (uppercase, unique per shop),
  product_name, company, model_number,
  product_category: constant enum,
  selling_price, cost_price, quantity,
  warranty_start_date, warranty_end_date, pro_warranty_end_date,
  warranty_type, warranty_duration_months,
  manufacturing_date, capacity_rating, voltage,
  batch_number, purchase_source, status (ACTIVE,...),
  product_images[], notes, deleted_at, timestamps
}
```

### ServicePlan model (`models/ServicePlan.js`)
```js
ServicePlan {
  invoice_item_id: ObjectId(InvoiceItem),
  shop_id: ObjectId(Shop),
  service_interval_type: [MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY, CUSTOM],
  service_interval_value: Number,
  total_services: Number,
  service_start_date: Date,
  service_end_date: Date,
  is_active: Boolean,
  is_editable_after_invoice: Boolean,
  notes, service_charge,
  deleted_at,
  timestamps
}
```

### ServiceSchedule model (`models/ServiceSchedule.js`)
```js
ServiceSchedule {
  service_plan_id: ObjectId(ServicePlan),
  scheduled_date: Date,
  original_date: Date,
  service_number: Number,
  status: [PENDING, COMPLETED, MISSED, RESCHEDULED, CANCELLED],
  rescheduled_date?, grace_period_days, auto_generated,
  service_charge, amount_collected, payment_status,
  completed_at, completed_by(User), service_visit_id,
  deleted_at, timestamps
}
```

### Inferred additional relationships
- `ServiceSchedule` likely has `invoice_item_id` via join from plan.
- `ServiceVisit` exists to record actual service work.

---

## 7. Data relationship map

```
Invoice (n) --- (n) InvoiceItem
InvoiceItem (1) --- (1) ServicePlan
ServicePlan (1) --- (many) ServiceSchedule
Shop --- Invoice / InvoiceItem / ServicePlan / ServiceSchedule
Customer --- Invoice + reminders output
```

---

## 8. Edge Cases and Improvements

### explicit in code
- `service_plan_enabled` true + missing `service_plan` -> no plan created.
- `total_services` invalid -> fallback 1.
- `item.service_plan.total_services` with zero or NaN -> fallback 1.
- `service_interval_type` and `service_interval_value` validation strongly required in update endpoint.
- `no invoiceItem` or failed plan creation triggers abort transaction.

### recommended improvements
- Force consistent interval config object at request-level.
- validate interval types and values at API boundary.
- rollback on schedule generation failure with strong transaction.
- allow dry update path for existing `COMPLETED` schedule preservation.
- add data audit fields.

---

## 9. Suggested architecture improvements

- extract service plan->schedule generation into an async worker event for resiliency.
- make scheduler scalable using message queue / cron in worker.
- add index on `ServiceSchedule({ scheduled_date:1, status:1 ,deleted_at:1})` (already there).
- create `next_service_run` field in ServicePlan for request efficiency.

---

## 10. Quick code snippet (invoice with service plan)

```js
if (item.service_plan_enabled && item.service_plan) {
  const totalServices = Number(item.service_plan.total_services) > 0 ? Number(item.service_plan.total_services) : 1;
  const serviceStart = item.service_plan.service_start_date ? new Date(item.service_plan.service_start_date) : new Date();
  const serviceEnd = this.computeServiceEndDate(serviceStart, item.service_plan.service_interval_type, item.service_plan.service_interval_value, totalServices);

  const servicePlan = new ServicePlan({
    invoice_item_id: invoiceItem._id,
    shop_id: user.shopId,
    service_interval_type: item.service_plan.service_interval_type,
    service_interval_value: item.service_plan.service_interval_value,
    total_services: totalServices,
    service_start_date: serviceStart,
    service_end_date: serviceEnd,
    service_description: item.service_plan.service_description,
    service_charge: item.service_plan.service_charge || 0,
    is_active: item.service_plan.is_active !== false,
    created_by: user.userId,
  });

  await servicePlan.save({ session });
  await this.generateServiceSchedules(servicePlan, session);
}
```

---

## 11. Additional references
- `backend/scheduler/reminders/ServiceReminderScheduler.js`
- `backend/scheduler/core/utils.js` (`createDateRange`, `getISTTodayParts`, `getShopName`)
- `backend/models/{Invoice,InvoiceItem,ServicePlan,ServiceSchedule}.js`
- `backend/controllers/invoiceController.js` (service plan creation + generation path)
