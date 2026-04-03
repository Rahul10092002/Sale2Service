import mongoose from "mongoose";

const reminderLogSchema = new mongoose.Schema(
  {
    reminder_log_id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    reminder_rule_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReminderRule",
    },
    entity_id: {
      type: String, // invoice_id, invoice_item_id, or service_schedule_id
      required: true,
    },
    entity_type: {
      type: String,
      enum: ["INVOICE", "PRODUCT", "SERVICE", "CUSTOMER"],
      required: true,
    },
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
    },
    recipient_number: {
      type: String,
      required: true,
      trim: true,
    },
    recipient_name: {
      type: String,
      required: true,
      trim: true,
    },
    message_content: {
      type: String,
      required: true,
    },
    template_name: {
      type: String,
      trim: true,
    },
    message_status: {
      type: String,
      enum: ["PENDING", "SENT", "DELIVERED", "FAILED", "READ"],
      default: "PENDING",
    },
    provider_message_id: {
      type: String,
      trim: true,
    },
    sent_at: {
      type: Date,
    },
    delivered_at: {
      type: Date,
    },
    failure_reason: {
      type: String,
      trim: true,
    },
    retry_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    max_retries: {
      type: Number,
      default: 3,
      min: 0,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
reminderLogSchema.index({ reminder_rule_id: 1, deleted_at: 1 });
reminderLogSchema.index({ shop_id: 1, deleted_at: 1 });
reminderLogSchema.index({ entity_id: 1, entity_type: 1, deleted_at: 1 });
reminderLogSchema.index({ message_status: 1, deleted_at: 1 });
reminderLogSchema.index({ sent_at: 1, deleted_at: 1 });
reminderLogSchema.index({ recipient_number: 1, deleted_at: 1 });

// Virtual for active logs
reminderLogSchema.virtual("isActive").get(function () {
  return this.deleted_at === null;
});

const ReminderLog = mongoose.model("ReminderLog", reminderLogSchema);
export default ReminderLog;
