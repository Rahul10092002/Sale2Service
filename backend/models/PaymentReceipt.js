import mongoose from "mongoose";

const paymentAllocationSchema = new mongoose.Schema(
  {
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    invoice_number: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    allocation_date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const paymentReceiptSchema = new mongoose.Schema(
  {
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    receipt_number: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    payment_method: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "WALLET", "OTHER"],
      default: "CASH",
    },
    payment_date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    transaction_reference: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["COMPLETED", "REVERSED"],
      default: "COMPLETED",
      index: true,
    },
    allocations: [paymentAllocationSchema],
    advance_amount_credited: {
      type: Number,
      default: 0,
      min: 0,
    },
    idempotency_key: {
      type: String,
      trim: true,
      sparse: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    recorded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reversal_reason: {
      type: String,
      trim: true,
      default: null,
    },
    reversed_at: {
      type: Date,
      default: null,
    },
    reversed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentReceiptSchema.index({ shop_id: 1, receipt_number: 1 }, { unique: true });
paymentReceiptSchema.index(
  { shop_id: 1, idempotency_key: 1 },
  { unique: true, sparse: true }
);
paymentReceiptSchema.index({ shop_id: 1, customer_id: 1, payment_date: -1 });
paymentReceiptSchema.index({ shop_id: 1, "allocations.invoice_id": 1 });
paymentReceiptSchema.index({ shop_id: 1, deleted_at: 1, payment_date: -1 });

const PaymentReceipt = mongoose.model("PaymentReceipt", paymentReceiptSchema);

export default PaymentReceipt;

