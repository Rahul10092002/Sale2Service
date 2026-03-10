import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    shop_name: {
      type: String,
      required: true,
      trim: true,
    },
    // Shop name in Hindi
    shop_name_hi: {
      type: String,
      trim: true,
      default: "",
    },
    business_type: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    gst_number: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    logo_url: {
      type: String,
      trim: true,
    },
    logo_public_id: {
      type: String,
      trim: true,
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

// Index for soft delete queries
shopSchema.index({ deleted_at: 1 });

// Virtual for active shops
shopSchema.virtual("isActive").get(function () {
  return this.deleted_at === null;
});

// Method to soft delete
shopSchema.methods.softDelete = function () {
  this.deleted_at = new Date();
  return this.save();
};

// Query helper to exclude deleted
shopSchema.query.notDeleted = function () {
  return this.where({ deleted_at: null });
};

const Shop = mongoose.model("Shop", shopSchema);

export default Shop;
