# Scheduler Service

A modular and well-structured scheduler system for handling automated reminders in the sales and service management system.

## 📁 Folder Structure

```
backend/
  scheduler/                     # Main scheduler folder
    ├── core/                    # Core functionality
    │   ├── BaseScheduler.js     # Base class for all schedulers
    │   └── utils.js             # Utility functions (phone validation, date formatting, etc.)
    ├── reminders/               # Reminder-specific modules
    │   ├── ServiceReminderScheduler.js     # Service reminders (upcoming, missed)
    │   ├── WarrantyReminderScheduler.js    # Warranty expiry/expired reminders
    │   └── PaymentReminderScheduler.js     # Payment pending reminders
    ├── messaging/               # Messaging functionality
    │   └── MessageSender.js     # Centralized WhatsApp messaging using MSG91 only
    └── index.js                 # Main scheduler orchestrator
```

## 🚀 Key Features

### **Modular Design**

- Separate modules for different reminder types (Service, Warranty, Payment)
- Base scheduler class with common functionality
- Centralized messaging service using only MSG91
- Utility functions for common operations

### **Simplified Messaging**

- **Single Provider**: Uses only `sendWhatsappMessageViaMSG91` function
- **No Confusion**: Removed duplicate WhatsApp messaging implementations
- **Consistent API**: All messaging goes through the same interface

### **Better Organization**

- Easy to find and update specific scheduler functions
- Clean separation of concerns
- Follows best coding practices
- Comprehensive error handling and logging

## 📋 Reminder Types

### 1. Service Reminders

- **Upcoming Services**: 3 days and 1 day before scheduled service
- **Missed Services**: Services past due date
- **Template**: `service_reminder`, `service_missed_v1`

### 2. Warranty Reminders

- **Expiry Warning**: 30, 15, 3 days before warranty expires
- **Expired Notice**: 1 day after warranty expires
- **Templates**: `warranty_expiry_v1`, `warranty_expired_v1`

### 3. Payment Reminders

- **Payment Due**: 3, 7, 15 days after invoice date for unpaid/partial invoices
- **Template**: `payment_pending_v1`

## ⏰ Schedule

The scheduler runs on the following cron schedule:

- **Hourly**: All reminders check (`0 * * * *`)
- **9 AM Daily**: Service reminders (`0 9 * * *`)
- **10 AM Daily**: Warranty reminders (`0 10 * * *`)
- **11 AM Daily**: Payment reminders (`0 11 * * *`)

## 🔧 Configuration

### Required Environment Variables

```bash
# MSG91 Configuration (Required)
MSG91_API_ENDPOINT="https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/"
MSG91_AUTHKEY="your_authkey"
MSG91_NUMBER="your_whatsapp_number"
MSG91_NAMESPACE="your_namespace"

# Optional
SHOP_NAME="Your Shop Name"
```

## 💻 Usage

### Basic Usage

```javascript
import SchedulerService from "./scheduler/index.js";

// Initialize and start scheduler
const scheduler = new SchedulerService();
scheduler.startScheduler();
```

### Manual Testing

```javascript
// Test all reminders
await scheduler.runManualTest();

// Test specific reminder type
await scheduler.runManualTest("service"); // Service reminders only
await scheduler.runManualTest("warranty"); // Warranty reminders only
await scheduler.runManualTest("payment"); // Payment reminders only
```

### Check Status

```javascript
const status = scheduler.getStatus();
console.log(status);
// Output:
// {
//   isRunning: true,
//   isConfigured: true,
//   schedulers: {
//     service: "ServiceReminderScheduler",
//     warranty: "WarrantyReminderScheduler",
//     payment: "PaymentReminderScheduler"
//   },
//   environment: {
//     msg91Configured: true,
//     shopName: "My Shop"
//   }
// }
```

### Test Message Sending

```javascript
// Test sending a message
const result = await scheduler.testMessage(
  "919876543210", // Phone number
  "service_reminder", // Template name
  {
    // Variables
    1: "Customer Name",
    2: "Product Name",
    3: "25-12-2024",
    4: "Shop Name",
  },
);
```

## 🛠️ API Endpoints

### Debug Endpoints (Development Only)

```bash
# Run manual scheduler test
POST /v1/debug/scheduler-run
Body: { "type": "all|service|warranty|payment" }

# Get scheduler status
GET /v1/debug/scheduler-status

# Test message sending
POST /v1/debug/test-message
Body: {
  "phoneNumber": "919876543210",
  "templateName": "service_reminder",
  "variables": { "1": "Name", "2": "Product", ... }
}
```

## 📝 Migration from Old Structure

The new structure replaces:

- ❌ `backend/service/schedulerService.js` (monolithic)
- ❌ `backend/service/whatsappService.js` (duplicate messaging)

With:

- ✅ Modular scheduler components in `backend/scheduler/`
- ✅ Single MSG91 messaging implementation
- ✅ Better separation of concerns
- ✅ Easier maintenance and updates

## 🔍 Logging

All scheduler activities are logged with structured information:

```
[ServiceReminderScheduler] Processing service reminders...
[ServiceReminderScheduler] Found 5 upcoming services
[ServiceReminderScheduler] Service reminder sent successfully { customer: "John Doe", product: "AC", serviceDate: "25-12-2024" }
```

## 🧪 Testing

### Test Script

```bash
node backend/scripts/test-service-reminders.js
```

This will test all scheduler components and provide detailed output.

### Key Test Points

1. **Configuration Check**: Verifies MSG91 settings
2. **Database Connection**: Tests MongoDB connectivity
3. **Reminder Processing**: Tests each reminder type
4. **Message Sending**: Validates WhatsApp delivery
5. **Error Handling**: Ensures graceful error recovery

## 📚 Best Practices

1. **Use Type-Specific Methods**: Call `runManualTest("service")` for targeted testing
2. **Monitor Logs**: Check logs for delivery status and errors
3. **Test Configuration**: Use debug endpoints to verify setup
4. **Handle Errors**: All methods include proper error handling
5. **Rate Limiting**: MSG91 handles rate limiting automatically

## 🔒 Security Notes

- Debug endpoints only work in non-production environments
- Phone numbers are validated before sending
- MSG91 credentials are securely managed through environment variables
- All database operations use proper authentication and validation
