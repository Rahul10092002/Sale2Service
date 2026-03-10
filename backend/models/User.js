import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "STAFF"],
      required: true,
    },
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
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
userSchema.index({ email: 1, deleted_at: 1 });
userSchema.index({ phone: 1, deleted_at: 1 });
userSchema.index({ shop_id: 1, deleted_at: 1 });

// Hash password before saving
// Use async/await middleware style without `next` to avoid "next is not a function" when
// Mongoose treats the middleware as promise-based.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to soft delete
userSchema.methods.softDelete = function () {
  this.deleted_at = new Date();
  return this.save();
};

// Query helper to exclude deleted
userSchema.query.notDeleted = function () {
  return this.where({ deleted_at: null });
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model("User", userSchema);

export default User;
