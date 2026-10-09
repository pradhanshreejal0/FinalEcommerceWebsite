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
      default: "Foundry",
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

    // ——— Storefront (admin-only editable) ———
    hero: {
      visible: { type: Boolean, default: true },
      kicker: { type: String, default: "The good find starts here" },
      title: { type: String, default: "Find your everyday, elevated." },
      subtitle: {
        type: String,
        default:
          "Considered finds for the way you live, work, move and make a home.",
      },
      ctaText: { type: String, default: "Shop the collection" },
      ctaLink: { type: String, default: "/products" },
      imageUrl: {
        type: String,
        default:
          "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1900",
      },
      captionLeft: { type: String, default: "Made for everyday" },
      captionRight: { type: String, default: "01 / 04" },
    },

    promo: {
      visible: { type: Boolean, default: true },
      badge: { type: String, default: "THE FOUNDRY EDIT" },
      title: { type: String, default: "Good design\nis for living." },
      subtitle: {
        type: String,
        default: "Meet pieces with a little more thought behind them.",
      },
      ctaText: { type: String, default: "Shop the edit" },
      ctaLink: { type: String, default: "/products" },
      imageUrl: {
        type: String,
        default:
          "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200",
      },
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
