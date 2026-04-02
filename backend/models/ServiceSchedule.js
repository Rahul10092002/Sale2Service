import mongoose from "mongoose";

const serviceScheduleSchema = new mongoose.Schema(
  {
    service_schedule_id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    service_plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServicePlan",
      required: true,
    },
    scheduled_date: {
      type: Date,
      required: true,
    },
    service_number: {
      type: Number,
      required: true, // 1st service, 2nd service, etc.
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "MISSED", "RESCHEDULED", "CANCELLED"],
      default: "PENDING",
    },
    original_date: {
      type: Date,
      required: true,
    },
    rescheduled_date: {
      type: Date,
    },
    grace_period_days: {
      type: Number,
      default: 7,
    },
    auto_generated: {
      type: Boolean,
      default: true,
    },
    reschedule_reason: {
      type: String,
      trim: true,
    },
    rescheduled_by: {
      type: String,
      enum: ["CUSTOMER", "SHOP", "SYSTEM"],
    },
    rescheduled_at: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    service_charge: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount_collected: {
      type: Number,
      default: 0,
      min: 0,
    },
    payment_status: {
      type: String,
      enum: ["PENDING", "PARTIAL", "PAID", "FREE"],
      default: "PENDING",
    },
    completed_at: {
      type: Date,
    },
    completed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    service_visit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceVisit",
    },
    deleted_at: {
      type: Date,
      default: null,
    },
    next_reminder_at: Date,
    reminder_stage: {
      type: String,
      enum: ["UPCOMING_3D", "UPCOMING_1D", "TODAY", "MISSED", "FOLLOWUP"],
    },
    last_reminder_sent_at: Date,
    retry_count: { type: Number, default: 0 },
    max_retries: { type: Number, default: 3 },
  },
  {
    timestamps: true,
  },
);

// Indexes
serviceScheduleSchema.index({ service_plan_id: 1, deleted_at: 1 });
serviceScheduleSchema.index({ scheduled_date: 1, status: 1, deleted_at: 1 });
serviceScheduleSchema.index({ status: 1, deleted_at: 1 });

// Virtual for active schedules
serviceScheduleSchema.virtual("isActive").get(function () {
  return this.deleted_at === null;
});

// Virtual for overdue status
serviceScheduleSchema.virtual("isOverdue").get(function () {
  return this.scheduled_date < new Date() && this.status === "PENDING";
});

const ServiceSchedule = mongoose.model(
  "ServiceSchedule",
  serviceScheduleSchema,
);
export default ServiceSchedule;
