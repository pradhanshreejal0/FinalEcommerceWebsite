import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    storeName: { type: String, required: true },
    storeSlug: { type: String, required: true, unique: true },
    storeDescription: { type: String, default: "" },
    logo: { type: String, default: "" },
    banner: { type: String, default: "" },
    // WhatsApp contact number in international format, digits only
    // (no "+", spaces or dashes), e.g. "9779812345678".
    phone: { type: String,required: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Vendor", vendorSchema);
