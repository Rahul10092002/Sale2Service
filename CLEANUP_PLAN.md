# Unused Service Code Cleanup Plan

## Overview

This document outlines **ONLY the unused service-related code** that will be removed. All other functionality (customers, invoices, products, users, dashboard, etc.) will be **KEPT INTACT**.

## Analysis Summary

After analyzing the codebase, I found that you're using several service components, not just the Service Table Modal. Here's what's actually being used vs unused:

## What Will Be KEPT (All Non-Service + Used Service Code)

- **All customer, invoice, product, user, dashboard functionality** ✅
- **All RTK Query APIs for non-service features** ✅
- **All page components** ✅
- **All backend routes, controllers, models for non-service features** ✅
- **Service components that are actually used:**
  - `ServiceTableModal.jsx` (used in Products.jsx)
  - `ServiceIntegration.jsx` (used in ProductView.jsx and InvoiceView.jsx)
  - `ServiceHistoryModal.jsx` (used by ServiceIntegration)
  - `ScheduleServiceModal.jsx` (used by ServiceIntegration and ServiceHistoryModal)
- **Service APIs that are actually used:**
  - `useGetServicesByProductQuery`
  - `useRescheduleServiceMutation`
  - `useMarkServiceCompleteMutation`
  - `useCancelServiceMutation`
  - `useGetInvoiceItemServicesQuery` (from invoiceApi)

## UNUSED SERVICE CODE TO BE DELETED

### Frontend - Unused Service Components

1. **`frontend/src/components/service/ServicePlanForm.jsx`**
   - Exported in index.js but never imported or used anywhere
2. **`frontend/src/components/service/ServiceVisitForm.jsx`**
   - Exported in index.js but never imported or used anywhere
3. **`frontend/src/components/service/ServiceScheduleCard.jsx`**
   - No usage found in the codebase

### Frontend - Unused Service APIs

From `frontend/src/features/services/serviceApi.js`, remove:

1. **`getServiceDashboard`** endpoint and `useGetServiceDashboardQuery`
2. **`getServiceSchedules`** endpoint and `useGetServiceSchedulesQuery`
3. **`createServiceVisit`** endpoint and `useCreateServiceVisitMutation`
4. **`getServiceVisits`** endpoint and `useGetServiceVisitsQuery`
5. **`getServicePlans`** endpoint and `useGetServicePlansQuery`
6. **`createServicePlan`** endpoint and `useCreateServicePlanMutation`
7. **`updateServicePlan`** endpoint and `useUpdateServicePlanMutation`
8. **`deleteServicePlan`** endpoint and `useDeleteServicePlanMutation`

### Frontend - Route Cleanup

From `frontend/src/routes/AppRoutes.jsx`:

- Remove broken import: `import ServiceDashboard from "../pages/services/ServiceDashboard.jsx"`
  (This file doesn't exist and causes import error)

### Backend - Unused Service APIs

1. **`backend/routes/servicePlan.js`** - entire file (service plan functionality not used)
2. **`backend/controllers/servicePlanController.js`** - entire file
3. **`backend/models/ServicePlan.js`** - can be removed if no service plans are used

### Backend - Unused Service Endpoints

From `backend/routes/service.js`, remove:

- Service dashboard endpoint (if exists)
- Service plans related endpoints
- Service visit creation endpoints (if not used by the modals)

### Backend - Scheduler Cleanup

If service reminder scheduling is not used:

- `backend/scripts/test-service-reminders.js`
- Related service reminder functionality in scheduler

## ESTIMATED IMPACT

### Files to be deleted: ~5-8 files

### Code reduction: ~5-10% of service-related code only

### Remaining functionality:

- **ALL existing features stay intact** ✅
- **Service table modal and service management** ✅
- **Service integration in products and invoices** ✅

## MINIMAL RISK CLEANUP

This cleanup focuses only on:

1. Removing unused service components that are already dead code
2. Removing unused service API endpoints
3. Fixing broken import in AppRoutes.jsx
4. Cleaning up service plan functionality if unused

---

**✅ SAFE: This cleanup preserves ALL your existing functionality and only removes actual unused service code.**

**Ready to proceed? Reply with "APPROVED" to start the minimal cleanup process.**
