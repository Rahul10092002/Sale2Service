import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    permissions: [
      {
        type: String,
        required: true,
      },
    ],
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
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
roleSchema.index({ shop_id: 1, name: 1, deleted_at: 1 });

const Role = mongoose.model("Role", roleSchema);

export default Role;
