import mongoose from "mongoose";

const reminderRuleSchema = new mongoose.Schema(
  {
    reminder_rule_id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    event_type: {
      type: String,
      enum: [
        "INVOICE_CREATED",
        "PAYMENT_PENDING",
        "WARRANTY_EXPIRY",
        "WARRANTY_EXPIRED",
        "SERVICE_DUE",
        "SERVICE_MISSED",
        "SERVICE_COMPLETED",
      ],
      required: true,
    },
    entity_type: {
      type: String,
      enum: ["INVOICE", "PRODUCT", "SERVICE"],
      required: true,
    },
    offset_days: {
      type: Number,
      required: true, // -30 (30 days before), +1 (1 day after)
    },
    channel: {
      type: String,
      enum: ["WHATSAPP", "SMS", "EMAIL"],
      default: "WHATSAPP",
    },
    template_name: {
      type: String,
      required: true,
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    description: {
      type: String,
      trim: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
reminderRuleSchema.index({ shop_id: 1, event_type: 1, deleted_at: 1 });
reminderRuleSchema.index({ is_active: 1, deleted_at: 1 });

// Virtual for active rules
reminderRuleSchema.virtual("isActive").get(function () {
  return this.deleted_at === null && this.is_active;
});

const ReminderRule = mongoose.model("ReminderRule", reminderRuleSchema);
export default ReminderRule;
