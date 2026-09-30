import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String, default: "" },
    // percent | fixed
    discountType: {
      type: String,
      enum: ["percent", "fixed"],
      default: "percent",
    },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null }, // cap for percent
    usageLimit: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    // null = platform-wide; otherwise vendor-only coupon
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
  },
  { timestamps: true }
);

couponSchema.methods.isCurrentlyValid = function () {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.startsAt && now < this.startsAt) return false;
  if (this.expiresAt && now > this.expiresAt) return false;
  if (this.usageLimit != null && this.usedCount >= this.usageLimit) return false;
  return true;
};

export default mongoose.model("Coupon", couponSchema);
