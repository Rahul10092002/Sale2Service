import mongoose from "mongoose";

const serviceVisitSchema = new mongoose.Schema(
  {
    service_visit_id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    service_schedule_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceSchedule",
      required: true,
    },
    visit_date: {
      type: Date,
      required: true,
    },
    service_type: {
      type: String,
      enum: ["FREE", "WARRANTY", "PAID", "GOODWILL"],
      required: true,
    },
    technician_name: {
      type: String,
      required: true,
      trim: true,
    },
    technician_contact: {
      type: String,
      trim: true,
    },
    issue_reported: {
      type: String,
      required: true,
      trim: true,
    },
    work_done: {
      type: String,
      required: true,
      trim: true,
    },
    next_action: {
      type: String,
      trim: true,
    },
    service_duration_minutes: {
      type: Number,
      min: 0,
    },
    parts_replaced: [
      {
        part_name: {
          type: String,
          required: true,
          trim: true,
        },
        part_cost: {
          type: Number,
          min: 0,
          default: 0,
        },
        warranty_months: {
          type: Number,
          min: 0,
          default: 0,
        },
      },
    ],
    service_cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    customer_signature: {
      type: String, // File path
    },
    service_images: [
      {
        type: String, // File paths
      },
    ],
    before_service_images: [
      {
        type: String,
      },
    ],
    after_service_images: [
      {
        type: String,
      },
    ],
    service_documents: [
      {
        type: String,
      },
    ],
    voice_note: {
      type: String,
    },
    customer_rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    customer_feedback: {
      type: String,
      trim: true,
    },
    internal_notes: {
      type: String,
      trim: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
serviceVisitSchema.index({ service_schedule_id: 1, deleted_at: 1 });
serviceVisitSchema.index({ visit_date: 1, deleted_at: 1 });
serviceVisitSchema.index({ technician_name: 1, deleted_at: 1 });
serviceVisitSchema.index({ created_by: 1, deleted_at: 1 });

// Virtual for active visits
serviceVisitSchema.virtual("isActive").get(function () {
  return this.deleted_at === null;
});

const ServiceVisit = mongoose.model("ServiceVisit", serviceVisitSchema);
export default ServiceVisit;
