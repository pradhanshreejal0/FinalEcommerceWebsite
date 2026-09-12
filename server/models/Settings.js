import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    commissionPercentage: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },

    platformName: {
      type: String,
      default: "Multi-Vendor Marketplace",
    },

    supportEmail: {
      type: String,
      default: "",
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
  },
  { timestamps: true }
);

settingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model("Settings", settingsSchema);