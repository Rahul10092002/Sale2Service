# Reminder Testing Data Setup Guide

## Overview

This document provides sample data to create entries in your portal that will trigger all types of reminder messages within 2-3 days. The current date is **April 1, 2026**.

## Prerequisites

1. Ensure you have at least one Shop created in the system
2. Have MSG91 WhatsApp configured for message sending
3. **Important**: Register the following WhatsApp templates in MSG91:
   - `birthday_wish`
   - `anniversary_wish`
   - `service_reminder`
   - `service_missed_v1`
   - `payment_reminders`
   - `warranty_expiring`
   - `warranty_expired`
4. Create customers with valid WhatsApp numbers

## Test Data Creation

### 1. Customer Data for Wishes Reminders

Create customers with birthdays and anniversaries on **April 2, 3, 4, 2026**:

#### Customer 1: Birthday on April 2, 2026

```
Full Name: John Doe
WhatsApp Number: +91XXXXXXXXXX (use a valid number)
Email: john@example.com
Address:
  Line 1: 123 Main Street
  City: Mumbai
  State: Maharashtra
  Pincode: 400001
Date of Birth: April 2, 1990 (will trigger birthday wish on April 2)
Customer Type: RETAIL
Preferred Language: ENGLISH
Shop: [Select your shop]
```

#### Customer 2: Anniversary on April 3, 2026

```
Full Name: Jane Smith
WhatsApp Number: +91XXXXXXXXXX (use a valid number)
Email: jane@example.com
Address:
  Line 1: 456 Park Avenue
  City: Delhi
  State: Delhi
  Pincode: 110001
Anniversary Date: April 3, 2015 (will trigger anniversary wish on April 3)
Customer Type: RETAIL
Preferred Language: ENGLISH
Shop: [Select your shop]
```

#### Customer 3: Birthday on April 4, 2026

```
Full Name: Bob Wilson
WhatsApp Number: +91XXXXXXXXXX (use a valid number)
Email: bob@example.com
Address:
  Line 1: 789 Garden Road
  City: Bangalore
  State: Karnataka
  Pincode: 560001
Date of Birth: April 4, 1985 (will trigger birthday wish on April 4)
Customer Type: RETAIL
Preferred Language: ENGLISH
Shop: [Select your shop]
```

### 2. Invoice Data for Payment Reminders

Create unpaid invoices with dates that will trigger payment reminders:

#### Invoice 1: 3-day payment reminder (created March 30, 2026)

```
Invoice Number: INV-TEST-001
Customer: John Doe (from above)
Invoice Date: March 30, 2026
Payment Status: UNPAID
Payment Mode: CASH
Items:
  - Product: Test Battery
    Serial Number: TEST001
    Category: BATTERY
    Company: Test Company
    Model: TB-100
    Selling Price: ₹5000
    Quantity: 1
    Warranty: 12 months
Subtotal: ₹5000
Tax: ₹900
Total: ₹5900
```

#### Invoice 2: 7-day payment reminder (created March 25, 2026)

```
Invoice Number: INV-TEST-002
Customer: Jane Smith (from above)
Invoice Date: March 25, 2026
Payment Status: UNPAID
Payment Mode: UPI
Items:
  - Product: Test Inverter
    Serial Number: TEST002
    Category: INVERTER
    Company: Test Company
    Model: TI-200
    Selling Price: ₹15000
    Quantity: 1
    Warranty: 24 months
Subtotal: ₹15000
Tax: ₹2700
Total: ₹17700
```

#### Invoice 3: 15-day payment reminder (created March 17, 2026)

```
Invoice Number: INV-TEST-003
Customer: Bob Wilson (from above)
Invoice Date: March 17, 2026
Payment Status: PARTIAL
Payment Mode: CARD
Items:
  - Product: Test Solar Panel
    Serial Number: TEST003
    Category: SOLAR_PANEL
    Company: Test Company
    Model: TSP-300
    Selling Price: ₹25000
    Quantity: 1
    Warranty: 60 months
Subtotal: ₹25000
Tax: ₹4500
Total: ₹29500
```

### 3. Warranty Data for Warranty Reminders

Update the warranty dates for the invoice items created above:

#### Warranty 1: Expires in 3 days (April 4, 2026)

For Invoice INV-TEST-001, Item TEST001:

```
Warranty Start Date: March 30, 2026
Warranty End Date: April 4, 2026 (3 days from now)
Warranty Type: STANDARD
Warranty Duration: 12 months
```

#### Warranty 2: Expires in 15 days (April 16, 2026)

For Invoice INV-TEST-002, Item TEST002:

```
Warranty Start Date: March 25, 2026
Warranty End Date: April 16, 2026 (15 days from now)
Warranty Type: STANDARD
Warranty Duration: 24 months
```

#### Warranty 3: Expired yesterday (March 31, 2026)

For Invoice INV-TEST-003, Item TEST003:

```
Warranty Start Date: March 17, 2026
Warranty End Date: March 31, 2026 (expired yesterday)
Warranty Type: STANDARD
Warranty Duration: 60 months
```

### 4. Service Schedule Data for Service Reminders

Create service plans and schedules for upcoming and missed services:

#### Service Plan 1: Upcoming service in 1 day (April 2, 2026)

```
For Invoice Item: TEST001 (Battery)
Service Plan:
  - Service Type: MAINTENANCE
  - Frequency: 6 months
  - Number of Services: 2
  - Service 1 Date: April 2, 2026 (1 day from now)
  - Service 2 Date: October 2, 2026
Status: PENDING
```

#### Service Plan 2: Upcoming service in 3 days (April 4, 2026)

```
For Invoice Item: TEST002 (Inverter)
Service Plan:
  - Service Type: MAINTENANCE
  - Frequency: 12 months
  - Number of Services: 2
  - Service 1 Date: April 4, 2026 (3 days from now)
  - Service 2 Date: April 4, 2027
Status: PENDING
```

#### Service Plan 3: Missed service (March 31, 2026)

```
For Invoice Item: TEST003 (Solar Panel)
Service Plan:
  - Service Type: MAINTENANCE
  - Frequency: 12 months
  - Number of Services: 5
  - Service 1 Date: March 31, 2026 (yesterday - missed)
  - Service 2 Date: March 31, 2027
  - Service 3 Date: March 31, 2028
  - Service 4 Date: March 31, 2029
  - Service 5 Date: March 31, 2030
Status: PENDING
```

## Expected Reminder Triggers

### Day 1: April 2, 2026 (6 AM IST)

- **Birthday Wish**: John Doe (birthday on April 2)
- **Service Reminder**: TEST001 Battery service (1 day ahead)
- **Payment Reminder**: INV-TEST-001 (3 days after invoice date)

### Day 2: April 3, 2026 (6 AM IST)

- **Anniversary Wish**: Jane Smith (anniversary on April 3)

### Day 3: April 4, 2026 (6 AM IST)

- **Birthday Wish**: Bob Wilson (birthday on April 4)
- **Service Reminder**: TEST002 Inverter service (3 days ahead)
- **Warranty Reminder**: TEST001 Battery warranty expires in 3 days

### Additional Triggers (Daily at respective times):

- **Payment Reminders**: Will trigger daily at 9 AM IST for all unpaid invoices
- **Warranty Reminders**: Will trigger daily at 8 AM IST for expiring warranties
- **Service Reminders**: Will trigger daily at 7 AM IST for upcoming/missed services

## Testing Instructions

1. **Create all the data above** in your portal
2. **Wait for the scheduled times** or use manual testing:
   ```javascript
   // In your backend terminal, run:
   const scheduler = new SchedulerService();
   await scheduler.runManualTest("all", true); // Force resend for testing
   ```
3. **Check WhatsApp messages** on the test numbers you used
4. **Monitor backend logs** for reminder processing details

## Message Templates Expected

Based on the scheduler code, here are the actual template names and expected message content:

- **Birthday Wish**: Template `birthday_wish` - "Happy Birthday [Name]! Wishing you a wonderful year ahead from [Shop Name]..."
- **Anniversary Wish**: Template `anniversary_wish` - "Happy Anniversary [Name]! Celebrating your special day with warm wishes from [Shop Name]..."
- **Service Reminder (Upcoming)**: Template `service_reminder` - "Service due reminder for your [Product Name] - Serial: [Serial Number]. Scheduled for [Date] at [Shop Name]..."
- **Service Reminder (Missed)**: Template `service_missed_v1` - "Service was due for your [Product Name] - Serial: [Serial Number]. Please contact [Shop Name] to schedule..."
- **Payment Reminder**: Template `payment_reminders` - "Payment reminder for Invoice [Number] - Amount: ₹[Amount]. Due date was [Date]. Please pay at [Shop Name]..."
- **Warranty Expiry**: Template `warranty_expiring` - "नमस्ते [Name] जी, आपकी [Product] की वारंटी [Days] दिनों में समाप्त होने वाली है..."
- **Warranty Expired**: Template `warranty_expired` - "नमस्ते [Name] जी, आपकी [Product] की वारंटी समाप्त हो चुकी है..."

## Troubleshooting

1. **No messages received**: Check MSG91 configuration and WhatsApp number validity
2. **Wrong dates**: Ensure dates are set correctly in IST timezone
3. **Messages not triggering**: Check scheduler logs and database entries
4. **Duplicate messages**: The system has deduplication, but manual testing bypasses it

## Cleanup

After testing, you can:

1. Delete test customers and invoices
2. Remove test service schedules
3. Clear message logs if needed

This setup will test all reminder types within 2-3 days from April 1, 2026.
