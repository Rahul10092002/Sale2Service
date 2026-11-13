import mongoose from "mongoose";

const googleAccountSchema = new mongoose.Schema(
  {
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      unique: true,
      index: true,
    },
    connected_email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    connected_name: {
      type: String,
      trim: true,
    },
    connected_picture: {
      type: String,
      trim: true,
    },
    // Ephemeral cached access token
    access_token: {
      type: String,
    },
    access_token_expires_at: {
      type: Date,
    },
    // Encrypted OAuth Refresh Token (AES-256-GCM)
    refresh_token_encrypted: {
      type: String,
    },
    refresh_token_iv: {
      type: String,
    },
    refresh_token_tag: {
      type: String,
    },
    is_connected: {
      type: Boolean,
      default: false,
      index: true,
    },
    auto_sync_enabled: {
      type: Boolean,
      default: true,
    },
    scope: {
      type: [String],
      default: [],
    },
    total_synced_contacts: {
      type: Number,
      default: 0,
    },
    total_skipped_duplicates: {
      type: Number,
      default: 0,
    },
    last_sync_at: {
      type: Date,
    },
    last_sync_status: {
      type: String,
      enum: ["IDLE", "SUCCESS", "FAILED", "PARTIAL"],
      default: "IDLE",
    },
    last_sync_error: {
      type: String,
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

googleAccountSchema.index({ shop_id: 1, deleted_at: 1 });

const GoogleAccount = mongoose.model("GoogleAccount", googleAccountSchema);

export default GoogleAccount;

