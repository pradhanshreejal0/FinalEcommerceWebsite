import mongoose from "mongoose";

const descriptionSectionSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    content: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const variantAttributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    // Stable key e.g. "Color:Red|Size:M" for cart matching
    key: { type: String, required: true, trim: true },
    attributes: { type: [variantAttributeSchema], default: [] },
    // Human label e.g. "Color: Red / Size: M"
    label: { type: String, default: "", trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    descriptionSections: {
      type: [descriptionSectionSchema],
      default: [],
      validate: {
        validator(v) {
          return !v || v.length <= 4;
        },
        message: "Maximum 4 description sections allowed",
      },
    },
    descriptionStyle: {
      type: String,
      enum: ["paragraphs", "cards", "tabs", "accordion", "list"],
      default: "paragraphs",
    },
    // Base / display price (min variant price when hasVariants)
    price: { type: Number, required: true, min: 0 },
    // Total stock (sum of variants when hasVariants)
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
    discountPercentage: { type: Number, default: 0, min: 0, max: 90 },

    // Flexible options: color, size, volume, etc. — vendor chooses
    hasVariants: { type: Boolean, default: false },
    variants: { type: [variantSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual("finalPrice").get(function () {
  if (this.discountPercentage > 0) {
    const discounted =
      this.price - (this.price * this.discountPercentage) / 100;
    return Math.round(discounted * 100) / 100;
  }
  return this.price;
});

productSchema.index({ isPublished: 1, createdAt: -1 });
productSchema.index({ isPublished: 1, price: 1 });
productSchema.index({ isPublished: 1, category: 1 });
productSchema.index({ vendor: 1 });
productSchema.index({ title: "text", description: "text" });

export default mongoose.model("Product", productSchema);
