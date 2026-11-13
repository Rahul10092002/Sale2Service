import mongoose from "mongoose";

const googleContactSyncLogSchema = new mongoose.Schema(
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
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
    },
    customer_name: {
      type: String,
      trim: true,
    },
    phone_number: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      enum: ["CREATED", "SKIPPED_DUPLICATE", "FAILED"],
      required: true,
    },
    google_resource_name: {
      type: String,
    },
    error_message: {
      type: String,
    },
    attempt_count: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

googleContactSyncLogSchema.index({ shop_id: 1, createdAt: -1 });
googleContactSyncLogSchema.index({ shop_id: 1, customer_id: 1 });

const GoogleContactSyncLog = mongoose.model(
  "GoogleContactSyncLog",
  googleContactSyncLogSchema
);

export default GoogleContactSyncLog;

