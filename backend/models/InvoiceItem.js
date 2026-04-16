import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema(
  {
    invoice_item_id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    // Product Information
    serial_number: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
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
      required: true,
    },
    battery_type: {
      type: String,
      enum: ["INVERTER_BATTERY", "VEHICLE_BATTERY"],
    },
    vehicle_name: {
      type: String,
      trim: true,
    },
    vehicle_number_plate: {
      type: String,
      trim: true,
      uppercase: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    model_number: {
      type: String,
      required: true,
      trim: true,
    },
    // Pricing
    selling_price: {
      type: Number,
      required: true,
      min: 0,
    },
    cost_price: {
      type: Number,
      min: 0,
    },
    margin: {
      type: Number,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    hsn_code: {
      type: String,
      trim: true,
    },
    gst_rate: {
      type: Number,
      default: 18,
    },
    taxable_amount: {
      type: Number,
      min: 0,
    },
    gst_amount: {
      type: Number,
      min: 0,
    },
    line_total: {
      type: Number,
      min: 0,
    },
    // Warranty Information
    warranty_start_date: {
      type: Date,
      required: true,
    },
    warranty_end_date: {
      type: Date,
      required: true,
    },
    pro_warranty_end_date: {
      type: Date,
    },
    warranty_type: {
      type: String,
      enum: ["STANDARD", "EXTENDED", "PRO"],
      default: "STANDARD",
    },
    warranty_duration_months: {
      type: Number,
      required: true,
      min: 1,
    },
    // Product Metadata (Future-Safe)
    manufacturing_date: {
      type: Date,
    },
    capacity_rating: {
      type: String,
      trim: true,
    },
    voltage: {
      type: String,
      trim: true,
    },
    batch_number: {
      type: String,
      trim: true,
    },
    purchase_source: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "REPLACED", "RETURNED", "UNDER_SERVICE"],
      default: "ACTIVE",
    },
    // Attachments
    product_images: [
      {
        type: String, // File paths/URLs
      },
    ],
    serial_number_image: {
      type: String,
    },
    warranty_card_image: {
      type: String,
    },
    installation_image: {
      type: String,
    },
    customer_with_product_image: {
      type: String,
    },
    additional_files: [
      {
        type: String,
      },
    ],
    notes: {
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

// Indexes
invoiceItemSchema.index(
  { serial_number: 1, shop_id: 1, deleted_at: 1 },
  { unique: true },
);
invoiceItemSchema.index({ invoice_item_id: 1, deleted_at: 1 });
invoiceItemSchema.index({ invoice_id: 1, deleted_at: 1 });
invoiceItemSchema.index({ shop_id: 1, deleted_at: 1 });
invoiceItemSchema.index({ product_category: 1, deleted_at: 1 });
invoiceItemSchema.index({ company: 1, deleted_at: 1 });
invoiceItemSchema.index({ warranty_end_date: 1, deleted_at: 1 });
invoiceItemSchema.index({ warranty_start_date: 1, deleted_at: 1 });
invoiceItemSchema.index({ status: 1, deleted_at: 1 });

// Virtual for active invoice items
invoiceItemSchema.virtual("isActive").get(function () {
  return this.deleted_at === null;
});

// Pre-save middleware to calculate margin
invoiceItemSchema.pre("save", async function () {
  if (this.cost_price && this.selling_price) {
    this.margin = this.selling_price - this.cost_price;
  }
});

const InvoiceItem = mongoose.model("InvoiceItem", invoiceItemSchema);

export default InvoiceItem;
