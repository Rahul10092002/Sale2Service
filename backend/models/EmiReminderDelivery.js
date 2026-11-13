import mongoose from "mongoose";

// Operational delivery claims; no soft deletion. One claim per installment date.
const schema = new mongoose.Schema({
  shop_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  invoice_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  due_date: { type: String, required: true },
  status: { type: String, enum: ["SENDING", "SENT", "FAILED"], default: "SENDING" },
  attempts: { type: Number, default: 1 },
}, { timestamps: true });
schema.index({ shop_id: 1, invoice_id: 1, due_date: 1 }, { unique: true });
export default mongoose.model("EmiReminderDelivery", schema);
