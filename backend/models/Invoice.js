import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoice_id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    invoice_number: {
      type: String,
      required: true,
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    invoice_date: {
      type: Date,
      required: true,
    },
    payment_status: {
      type: String,
      enum: ["PAID", "PARTIAL", "UNPAID"],
      default: "UNPAID",
    },
    payment_mode: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "MIXED", "CREDIT"],
      default: "CASH",
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount_paid: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount_due: {
      type: Number,
      default: 0,
      min: 0,
    },
    due_date: {
      type: Date,
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Attachments
    invoice_pdf: {
      type: String, // Cloudinary URL
    },
    pdf_public_id: {
      type: String, // Cloudinary public ID for deletion/management
    },
    signed_invoice: {
      type: String,
    },
    extra_documents: [
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
invoiceSchema.index(
  { invoice_number: 1, shop_id: 1, deleted_at: 1 },
  { unique: true },
);
invoiceSchema.index({ invoice_id: 1, deleted_at: 1 });
invoiceSchema.index({ customer_id: 1, deleted_at: 1 });
invoiceSchema.index({ shop_id: 1, deleted_at: 1 });
invoiceSchema.index({ invoice_date: 1, deleted_at: 1 });
invoiceSchema.index({ payment_status: 1, deleted_at: 1 });

// Virtual for active invoices
invoiceSchema.virtual("isActive").get(function () {
  return this.deleted_at === null;
});

// Virtual populate for invoice items
invoiceSchema.virtual("invoice_items", {
  ref: "InvoiceItem",
  localField: "_id",
  foreignField: "invoice_id",
  justOne: false,
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
