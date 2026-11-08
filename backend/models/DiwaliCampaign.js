import mongoose from "mongoose";

// Operational records: deliberately separate from customer data and reminder schedules.
const campaignSchema = new mongoose.Schema({
  _id: String,
  shop_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  state: { type: String, default: "DRAFT" },
  shop_name_hi: String,
  interval_ms: Number,
  recipient_cap: Number,
  send_until: Date,
  exclusions: [String],
  reason: String,
  next_send_at: Date,
  lease_until: Date,
  lease_token: String,
}, { timestamps: true });

const recipientSchema = new mongoose.Schema({
  _id: String,
  shop_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  campaign_id: { type: String, required: true },
  customer_id: mongoose.Schema.Types.ObjectId,
  name: String,
  phone: String,
  status: { type: String, default: "QUEUED" },
  reason: String,
  latest_attempt: String,
  attempt_count: { type: Number, default: 0 },
}, { timestamps: true });
recipientSchema.index({ shop_id: 1, campaign_id: 1, status: 1 });

const attemptSchema = new mongoose.Schema({
  _id: String,
  shop_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  campaign_id: { type: String, required: true },
  recipient_id: { type: String, required: true },
  phone: String,
  status: String,
  reason: String,
  provider_ids: [String],
  sent_at: Date,
  delivered_at: Date,
  read_at: Date,
  webhook_at: Date,
}, { timestamps: true });
attemptSchema.index({ shop_id: 1, campaign_id: 1, createdAt: 1 });
attemptSchema.index({ shop_id: 1, provider_ids: 1 });

export const DiwaliCampaign = mongoose.model("DiwaliCampaign", campaignSchema);
export const DiwaliRecipient = mongoose.model("DiwaliRecipient", recipientSchema);
export const DiwaliAttempt = mongoose.model("DiwaliAttempt", attemptSchema);
