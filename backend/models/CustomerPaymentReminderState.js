import mongoose from "mongoose";

/**
 * Tracks the state, frequency, and cycle of customer-level consolidated payment reminders.
 * Supports:
 * - 7-day spacing between overdue reminders (and 7-day initial delay from oldest due date)
 * - 3-day lead time upcoming payment reminders
 * - Cycle settling when dues are cleared
 * - Cross-run and restart idempotency
 */
const customerPaymentReminderStateSchema = new mongoose.Schema(
  {
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    reminder_category: {
      type: String,
      enum: ["OVERDUE", "UPCOMING"],
      required: true,
    },
    cycle_id: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    cycle_status: {
      type: String,
      enum: ["ACTIVE", "SETTLED"],
      default: "ACTIVE",
      index: true,
    },
    first_eligibility_date: {
      type: Date,
      default: null,
    },
    last_sent_at: {
      type: Date,
      default: null,
    },
    next_eligible_date: {
      type: Date,
      default: null,
    },
    last_invoice_count: {
      type: Number,
      default: 0,
    },
    last_outstanding_amount: {
      type: Number,
      default: 0,
    },
    last_reference_due_date: {
      type: Date,
      default: null,
    },
    total_reminders_sent: {
      type: Number,
      default: 0,
    },
    last_provider_message_id: {
      type: String,
      trim: true,
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index scoped by shop, customer, category, and soft deletion
customerPaymentReminderStateSchema.index(
  { shop_id: 1, customer_id: 1, reminder_category: 1, deleted_at: 1 },
  { unique: true }
);

const CustomerPaymentReminderState = mongoose.model(
  "CustomerPaymentReminderState",
  customerPaymentReminderStateSchema
);

export default CustomerPaymentReminderState;

