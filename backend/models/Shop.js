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
    bank_details: {
      account_holder_name: { type: String, trim: true },
      account_number: { type: String, trim: true },
      bank_name: { type: String, trim: true },
      ifsc_code: { type: String, trim: true },
      upi_id: { type: String, trim: true },
    },
    pdf_settings: {
      _id: false,
      // Header & Shop Info
      show_logo: { type: Boolean, default: true },
      show_shop_name: { type: Boolean, default: true },
      show_shop_address: { type: Boolean, default: true },
      show_shop_phone: { type: Boolean, default: true },
      show_shop_email: { type: Boolean, default: true },
      show_shop_gst: { type: Boolean, default: true },
      header_title: { type: String, trim: true, default: "TAX INVOICE" },
      show_invoice_number: { type: Boolean, default: true },

      // Customer Box
      show_customer_name: { type: Boolean, default: true },
      show_customer_address: { type: Boolean, default: true },
      show_customer_mobile: { type: Boolean, default: true },
      show_customer_gst: { type: Boolean, default: true },
      show_customer_email: { type: Boolean, default: true },

      // Invoice Details Box
      show_invoice_date: { type: Boolean, default: true },
      show_due_date: { type: Boolean, default: true },
      show_payment_status: { type: Boolean, default: true },
      show_payment_mode: { type: Boolean, default: true },
      show_reverse_charge: { type: Boolean, default: true },

      // Items Table Columns & Specifications
      show_hsn_column: { type: Boolean, default: true },
      show_qty_column: { type: Boolean, default: true },
      show_rate_column: { type: Boolean, default: true },
      show_taxable_column: { type: Boolean, default: true },
      show_tax_column: { type: Boolean, default: true },
      show_item_brand: { type: Boolean, default: true },
      show_item_model: { type: Boolean, default: true },
      show_item_serial: { type: Boolean, default: true },
      show_item_warranty: { type: Boolean, default: true },
      show_item_service_plan: { type: Boolean, default: true },
      show_item_notes: { type: Boolean, default: true },

      // Totals Breakdown
      show_subtotal: { type: Boolean, default: true },
      show_discount: { type: Boolean, default: true },
      show_exchange_price: { type: Boolean, default: true },
      show_tax_breakdown: { type: Boolean, default: true },
      show_amount_paid: { type: Boolean, default: true },
      show_balance_due: { type: Boolean, default: true },
      show_amount_in_words: { type: Boolean, default: true },

      // Bank, Payment & Notes
      show_bank_details: { type: Boolean, default: true },
      show_upi_qr: { type: Boolean, default: true },
      show_notes: { type: Boolean, default: true },

      // Footer & Terms
      show_terms: { type: Boolean, default: true },
      terms_and_conditions: {
        type: [String],
        default: [
          "Goods once sold will not be taken back or exchanged without valid reason.",
          "Warranty claims are subject to manufacturer terms & conditions.",
          "Subject to local jurisdiction only.",
        ],
      },
      show_signature: { type: Boolean, default: true },
      show_footer_note: { type: Boolean, default: true },
      footer_note: { type: String, trim: true, default: "This is a computer-generated invoice." },
    },
    delete_security_password: {
      type: String,
      select: false,
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
