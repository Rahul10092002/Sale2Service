# Scheduler Tasks

- **Hourly (every hour)**: Run `processAllReminders()` — triggers service, warranty and payment reminder checks.
- **Daily 9:00 AM**: Run `processServiceReminders()` — send service due reminders for upcoming services (3 days, 1 day) and mark/send missed service reminders for past due schedules.
- **Daily 10:00 AM**: Run `processWarrantyReminders()` — send warranty expiry reminders (30, 15, 3 days before) and warranty expired reminders (day after expiry).
- **Daily 11:00 AM**: Run `processPaymentReminders()` — send payment pending reminders for invoices 3, 7, and 15 days after invoice date (for `UNPAID`/`PARTIAL`).
- **Manual test**: `runManualTest()` — manually triggers `processAllReminders()` for testing.

Notes:

- Messages are sent via the `WhatsAppService` (`sendMessage`) and recorded in `ReminderLog` to prevent duplicate sends within 24 hours.
