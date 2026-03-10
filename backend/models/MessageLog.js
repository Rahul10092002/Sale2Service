import mongoose from "mongoose";

const MessageLogSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, default: null },
  campaignName: { type: String, default: null },
  destination: { type: String, required: true },
  userName: { type: String, default: null },
  status: {
    type: String,
    enum: ["success", "failed", "error"],
    default: "failed",
  },
  messageType: { type: String, default: null },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("MessageLog", MessageLogSchema);
