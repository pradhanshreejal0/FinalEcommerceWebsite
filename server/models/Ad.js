import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    image: { type: String, required: true }, // Cloudinary URL later
    link: { type: String, default: "" },
    position: {
      type: String,
      enum: ["homepage", "sidebar", "category"],
      default: "homepage",
    },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Ad", adSchema);