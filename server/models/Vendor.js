import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    storeSlug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    storeDescription: {
      type: String,
      default: "",
    },

    logo: {
      type: String,
      default: "",
    },

    banner: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      required: true,
      default: "",
    },

    // Vendor store location (needed for delivery fee calculation).
    // Defaults to Kathmandu so accounts can be created before the
    // exact store pin is set by admin or the vendor.
    location: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
        default: 27.7172,
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
        default: 85.324,
      },

      address: {
        type: String,
        default: "",
        trim: true,
      },

      city: {
        type: String,
        default: "Kathmandu",
        trim: true,
      },

      country: {
        type: String,
        default: "Nepal",
        trim: true,
      },
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Vendor", vendorSchema);
