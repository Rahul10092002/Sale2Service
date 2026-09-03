import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductMaster",
      required: true,
    },
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    purchase_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null,
    },
    serial_number: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    dealer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      default: null,
    },
    purchase_date: {
      type: Date,
      default: null,
    },
    purchase_invoice_ref: {
      type: String,
      trim: true,
      default: "",
    },
    purchase_price: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["IN_STOCK", "SOLD", "RETURNED", "UNDER_SERVICE", "DEFECTIVE_RMA"],
      default: "IN_STOCK",
      required: true,
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    invoice_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvoiceItem",
      default: null,
    },
    sold_at: {
      type: Date,
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Enforce uniqueness for non-empty serial numbers per shop
inventoryItemSchema.index(
  { shop_id: 1, serial_number: 1, deleted_at: 1 },
  {
    unique: true,
    partialFilterExpression: { serial_number: { $gt: "" } },
  }
);
inventoryItemSchema.index({ shop_id: 1, status: 1 });
inventoryItemSchema.index({ dealer_id: 1 });
inventoryItemSchema.index({ invoice_id: 1 });
inventoryItemSchema.index({ product_id: 1 });

const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);

export default InventoryItem;
