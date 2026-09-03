import mongoose from "mongoose";

const dealerSchema = new mongoose.Schema(
  {
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contact_person: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    tax_id: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

dealerSchema.index({ shop_id: 1, name: 1 });
dealerSchema.index({ shop_id: 1, phone: 1 });
dealerSchema.index({ shop_id: 1, deleted_at: 1 });

const Dealer = mongoose.model("Dealer", dealerSchema);

export default Dealer;
