import mongoose from "mongoose";

/**
 * ProductMaster – a lightweight catalog of known product templates.
 *
 * Populated from two sources:
 *   1. Auto-saved when a user types a new product name for the first time.
 *   2. Populated from InvoiceItem history via the autocomplete aggregation.
 *
 * This gives the autocomplete endpoint a stable fast lookup table in addition
 * to the real-time InvoiceItem aggregation.
 */
const productMasterSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    product_category: {
      type: String,
      enum: [
        "BATTERY",
        "INVERTER",
        "UPS",
        "SOLAR_PANEL",
        "CHARGER",
        "ACCESSORIES",
        "OTHER",
      ],
    },
    company: { type: String, trim: true },
    model_number: { type: String, trim: true },
    selling_price: { type: Number, min: 0 },
    capacity_rating: { type: String, trim: true },
    voltage: { type: String, trim: true },
    warranty_type: {
      type: String,
      enum: ["STANDARD", "PRO", "EXTENDED", "LIMITED", "NONE"],
    },
    warranty_duration_months: { type: Number, min: 0 },
    // true = auto-saved during invoice creation; false = manually created
    auto_saved: { type: Boolean, default: true },
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
  },
  { timestamps: true },
);

// Unique product name per shop (case-insensitive enforced in controller)
productMasterSchema.index(
  { product_name: 1, shop_id: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);
productMasterSchema.index({ shop_id: 1 });

const ProductMaster = mongoose.model("ProductMaster", productMasterSchema);

export default ProductMaster;
