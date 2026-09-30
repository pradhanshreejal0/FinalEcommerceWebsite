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
    refundAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("ReturnRequest", returnRequestSchema);
