import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String }],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    isPublished: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    // Percentage discount set by the vendor. 0 means no discount.
    discountPercentage: { type: Number, default: 0, min: 0, max: 90 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// The actual price a customer pays, after the vendor's discount is applied.
productSchema.virtual("finalPrice").get(function () {
  if (this.discountPercentage > 0) {
    const discounted =
      this.price - (this.price * this.discountPercentage) / 100;
    return Math.round(discounted * 100) / 100;
  }
  return this.price;
});

export default mongoose.model("Product", productSchema);