import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    customer_id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    whatsapp_number: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return !v || /^\S+@\S+\.\S+$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },
    alternate_phone: {
      type: String,
      trim: true,
    },
    address: {
      line1: {
        type: String,
        required: true,
        trim: true,
      },
      line2: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      pincode: {
        type: String,
        required: true,
        trim: true,
      },
    },
    date_of_birth: {
      type: Date,
    },
    anniversary_date: {
      type: Date,
    },
    gst_number: {
      type: String,
      trim: true,
    },
    customer_type: {
      type: String,
      enum: ["RETAIL", "BUSINESS", "DEALER"],
      default: "RETAIL",
    },
    preferred_language: {
      type: String,
      enum: ["ENGLISH", "HINDI", "TAMIL", "TELUGU", "KANNADA", "MALAYALAM"],
      default: "ENGLISH",
    },
    notes: {
      type: String,
      trim: true,
    },
    // Shop reference
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    // Attachments (future use)
    customer_images: [
      {
        type: String, // File paths/URLs
      },
    ],
    id_proof_files: [
      {
        type: String,
      },
    ],
    address_proof_files: [
      {
        type: String,
      },
    ],
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
customerSchema.index(
  { whatsapp_number: 1, shop_id: 1, deleted_at: 1 },
  { unique: true },
);
customerSchema.index({ customer_id: 1, deleted_at: 1 });
customerSchema.index({ shop_id: 1, deleted_at: 1 });
customerSchema.index({ full_name: "text" });

// Virtual for active customers
customerSchema.virtual("isActive").get(function () {
  return this.deleted_at === null;
});

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
