import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    // Earnings covered by this payout (after platform commission)
    amount: { type: Number, required: true, min: 0 },
    platformCommission: { type: Number, default: 0 },
    // Order ids included (optional tracking)
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "cancelled"],
      default: "pending",
    },
    method: { type: String, default: "bank_transfer" },
    reference: { type: String, default: "" },
    note: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Payout", payoutSchema);
