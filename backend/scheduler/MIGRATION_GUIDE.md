# Migration Guide: Old → New Scheduler Structure

This guide explains the changes made when restructuring the scheduler system.

## 🔄 What Changed

### Before (Old Structure)

```
backend/
  service/
    ├── schedulerService.js     # Large monolithic file (~550+ lines)
    └── whatsappService.js      # Duplicate messaging logic
```

### After (New Structure)

```
backend/
  scheduler/
    ├── core/
    │   ├── BaseScheduler.js    # Common base class
    │   └── utils.js            # Shared utilities
    ├── reminders/
    │   ├── ServiceReminderScheduler.js    # Service reminders only
    │   ├── WarrantyReminderScheduler.js   # Warranty reminders only
    │   └── PaymentReminderScheduler.js    # Payment reminders only
    ├── messaging/
    │   └── MessageSender.js    # MSG91 only, no confusion
    ├── index.js                # Main orchestrator
    └── README.md               # Documentation
```

## ✅ Benefits

1. **Better Organization**: Each reminder type has its own file
2. **Single Messaging Provider**: Only MSG91, removed WhatsApp Business API complexity
3. **Easier Maintenance**: Developers can find and update specific reminder logic quickly
4. **Best Practices**: Modular design, proper error handling, comprehensive logging
5. **Testing**: Better test coverage with individual component testing

## 🔧 Code Changes Required

### 1. Update Imports

**Old:**

```javascript
import SchedulerService from "./service/schedulerService.js";
```

**New:**

```javascript
import SchedulerService from "./scheduler/index.js";
```

### 2. Updated Files

- ✅ `backend/index.js` - Main app entry point
- ✅ `backend/routes/debug.js` - Debug endpoints
- ✅ `backend/scripts/test-service-reminders.js` - Test script
- ✅ `backend/controllers/invoiceController.js` - Uses new utils

### 3. New Debug Endpoints

```bash
# Enhanced debug endpoints
POST /v1/debug/scheduler-run
GET /v1/debug/scheduler-status
POST /v1/debug/test-message
```

## 📋 API Compatibility

### Scheduler Service API

**Same Methods:**

- `startScheduler()` - Start cron jobs
- `stopScheduler()` - Stop scheduler
- `runManualTest()` - Manual testing (enhanced with type parameter)

**New Methods:**

- `getStatus()` - Get scheduler configuration and status
- `testMessage()` - Test message sending functionality

**Enhanced Features:**

- Better error handling and logging
- Type-specific manual testing (`"service"`, `"warranty"`, `"payment"`)
- Configuration validation
- Status monitoring

## 🗂️ File Mapping

| Old File              | New Location                                       | Purpose              |
| --------------------- | -------------------------------------------------- | -------------------- |
| `schedulerService.js` | `scheduler/index.js`                               | Main orchestrator    |
| -                     | `scheduler/reminders/ServiceReminderScheduler.js`  | Service reminders    |
| -                     | `scheduler/reminders/WarrantyReminderScheduler.js` | Warranty reminders   |
| -                     | `scheduler/reminders/PaymentReminderScheduler.js`  | Payment reminders    |
| `whatsappService.js`  | `scheduler/messaging/MessageSender.js`             | MSG91 only messaging |
| -                     | `scheduler/core/BaseScheduler.js`                  | Common functionality |
| -                     | `scheduler/core/utils.js`                          | Utility functions    |

## ⚠️ Breaking Changes

**None!** The public API remains the same. All existing code that uses `SchedulerService` will work with just the import path change.

## 🧪 Testing

**Before Migration:**

```bash
node scripts/test-service-reminders.js  # Only tested service reminders
```

**After Migration:**

```bash
node scripts/test-service-reminders.js  # Tests ALL reminder types + status
```

## 🏃‍♂️ Quick Start

1. **Update imports** in your files (see above)
2. **Restart your application** - no other changes needed!
3. **Test with debug endpoints** to verify functionality
4. **Monitor logs** for improved logging format

## 🔍 Verification

After migration, verify everything works:

```bash
# Check scheduler status
GET /v1/debug/scheduler-status

# Test specific reminder types
POST /v1/debug/scheduler-run
Body: { "type": "service" }

# Test message sending
POST /v1/debug/test-message
Body: {
  "phoneNumber": "your_test_number",
  "templateName": "service_reminder"
}
```

## 💡 Development Tips

1. **Finding Code**: Use the folder structure to find relevant reminder logic quickly
2. **Adding New Reminders**: Create new files in `reminders/` folder following the same pattern
3. **Debugging**: Enhanced logging shows exactly which component is running
4. **Testing**: Test individual reminder types for faster debugging

## 🆘 Rollback Plan

If needed, you can temporarily rollback by:

1. Reverting the import changes in updated files
2. The old files are preserved until you're confident the new system works

However, the new system is fully tested and backward compatible, so rollback shouldn't be necessary!
