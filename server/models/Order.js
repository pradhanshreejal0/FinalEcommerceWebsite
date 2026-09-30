import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
  },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, default: "" },
  subtotal: { type: Number, default: 0 },
  // Platform cut on this line (from product subtotal)
  platformCommission: { type: Number, default: 0 },
  // Vendor keeps this after commission
  vendorEarnings: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  cancellationReason: { type: String, default: "" },
});

const deliveryVendorSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    distanceKm: { type: Number, default: 0 },
    fee: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderNumber: { type: String, default: "", unique: true },
    items: { type: [orderItemSchema], default: [] },
    shippingAddress: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      postalCode: { type: String, default: "", trim: true },
      country: { type: String, default: "Nepal", trim: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    subtotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Admin / platform cut from product sales (not delivery)
    commissionPercentage: { type: Number, default: 0 },
    platformCommission: { type: Number, default: 0 },
    // Sum of vendor earnings on products after commission
    vendorEarnings: { type: Number, default: 0 },

    delivery: {
      totalFee: { type: Number, default: 0 },
      vendors: { type: [deliveryVendorSchema], default: [] },
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    cancellationReason: { type: String, default: "" },
    paymentMethod: {
      type: String,
      enum: ["cod", "esewa", "khalti"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    // Gateway references
    paymentTransactionId: { type: String, default: "" },
    paymentProviderData: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
