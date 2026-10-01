import mongoose from "mongoose";

const returnRequestSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    // order item id (subdocument _id)
    orderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    reason: { type: String, required: true, trim: true },
    details: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "refunded", "cancelled"],
      default: "pending",
    },
    adminNote: { type: String, default: "" },
    refundAmount: { type: Number, default: 0, min: 0 },
    stockRestored: { type: Boolean, default: false },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

returnRequestSchema.index({ order: 1, orderItemId: 1 }, { unique: true });
returnRequestSchema.index({ user: 1, createdAt: -1 });
returnRequestSchema.index({ vendor: 1, status: 1, createdAt: -1 });

export default mongoose.model("ReturnRequest", returnRequestSchema);
