import mongoose from "mongoose";

const invoiceCounterSchema = new mongoose.Schema(
  {
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Shop",
    },
    date: {
      type: String, // "YYMMDD", e.g. "240403"
      required: true,
    },
    sequence: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Ensure a single counter per shop+date
invoiceCounterSchema.index({ shop_id: 1, date: 1 }, { unique: true });

const InvoiceCounter = mongoose.model("InvoiceCounter", invoiceCounterSchema);

export default InvoiceCounter;

