import mongoose from "mongoose";

const whatsappTemplateSchema = new mongoose.Schema(
  {
    template_id: {
      type: String,
      required: true,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    template_name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    template_content: {
      type: String,
      required: true,
    },
    variables: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        required: {
          type: Boolean,
          default: false,
        },
      },
    ],
    category: {
      type: String,
      enum: ["INVOICE", "WARRANTY", "SERVICE", "PAYMENT", "GREETING"],
      required: true,
    },
    language: {
      type: String,
      enum: ["EN", "HI", "TA", "TE", "KN", "ML"],
      default: "EN",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    approval_status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    approval_notes: {
      type: String,
      trim: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

// Indexes
whatsappTemplateSchema.index({ template_name: 1, deleted_at: 1 });
whatsappTemplateSchema.index({ category: 1, is_active: 1, deleted_at: 1 });
whatsappTemplateSchema.index({ approval_status: 1, deleted_at: 1 });

// Virtual for active templates
whatsappTemplateSchema.virtual("isActive").get(function () {
  return this.deleted_at === null && this.is_active;
});

const WhatsAppTemplate = mongoose.model(
  "WhatsAppTemplate",
  whatsappTemplateSchema,
);
export default WhatsAppTemplate;
