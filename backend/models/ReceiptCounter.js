import mongoose from "mongoose";

const receiptCounterSchema = new mongoose.Schema({
  shop_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  date: {
    type: String, // Format: YYMMDD
    required: true,
  },
  sequence: {
    type: Number,
    default: 0,
  },
});

receiptCounterSchema.index({ shop_id: 1, date: 1 }, { unique: true });

const ReceiptCounter = mongoose.model("ReceiptCounter", receiptCounterSchema);

export default ReceiptCounter;

