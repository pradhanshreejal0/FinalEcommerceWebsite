import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Normal category image
    image: {
      type: String,
      default: "",
    },

    // SVG icon - ONLY for parent categories
    icon: {
      type: String,
      default: "",
    },

    // Cloudinary public ID for deleting/replacing SVG
    iconPublicId: {
      type: String,
      default: "",
    },

    // null = parent category
    // ObjectId = subcategory
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Category", categorySchema);
