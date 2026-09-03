import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    inventory_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "PURCHASE_INTAKE",
        "RETROACTIVE_DEALER_LINK",
        "SERIAL_UPDATE",
        "STATUS_CHANGE",
      ],
      required: true,
    },
    previous_state: {
      type: Object,
      default: {},
    },
    new_state: {
      type: Object,
      default: {},
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ shop_id: 1, inventory_item_id: 1 });
auditLogSchema.index({ shop_id: 1, createdAt: -1 });

const InventoryAuditLog = mongoose.model("InventoryAuditLog", auditLogSchema);

export default InventoryAuditLog;
