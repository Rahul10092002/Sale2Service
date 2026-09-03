import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema(
  {
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    dealer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
    },
    dealer_invoice_no: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    purchase_date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    total_cost: {
      type: Number,
      min: 0,
      default: 0,
    },
    total_items_count: {
      type: Number,
      min: 1,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    purchase_bill_image: {
      type: String,
      default: "",
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
  { timestamps: true }
);

purchaseOrderSchema.index({ shop_id: 1, dealer_invoice_no: 1 });
purchaseOrderSchema.index({ shop_id: 1, dealer_id: 1 });

const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);

export default PurchaseOrder;
