import mongoose from "mongoose";

const servicePlanSchema = new mongoose.Schema(
  {
    service_plan_id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    invoice_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvoiceItem",
      required: true,
    },
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    service_interval_type: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"],
      required: true,
    },
    service_interval_value: {
      type: Number,
      required: true, // e.g., every 3 months
    },
    total_services: {
      type: Number,
      required: true,
    },
    service_start_date: {
      type: Date,
      required: true,
    },
    service_end_date: {
      type: Date,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_editable_after_invoice: {
      type: Boolean,
      default: true,
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
servicePlanSchema.index(
  { invoice_item_id: 1, deleted_at: 1 },
  { unique: true },
);
servicePlanSchema.index({ shop_id: 1, deleted_at: 1 });
servicePlanSchema.index({ service_start_date: 1, deleted_at: 1 });
servicePlanSchema.index({ service_end_date: 1, deleted_at: 1 });

// Virtual for active service plans
servicePlanSchema.virtual("isActive").get(function () {
  return this.deleted_at === null;
});

const ServicePlan = mongoose.model("ServicePlan", servicePlanSchema);
export default ServicePlan;
