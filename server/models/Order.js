
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

  title: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
  },

  image: {
    type: String,
    default: "",
  },

  subtotal: {
    type: Number,
    default: 0,
  },

  // Status for this specific vendor/product item
  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ],
    default: "pending",
  },

  // Vendor's cancellation reason for this item
  cancellationReason: {
    type: String,
    default: "",
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderNumber: {
      type: String,
      default: "",
      unique: true,
    },

    items: {
      type: [orderItemSchema],
      default: [],
    },

    shippingAddress: {
      fullName: {
        type: String,
        required: true,
      },

      phone: {
        type: String,
        required: true,
      },

      address: {
        type: String,
        required: true,
      },

      city: {
        type: String,
        required: true,
      },

      postalCode: {
        type: String,
        default: "",
      },

      country: {
        type: String,
        default: "Nepal",
      },
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    // Overall order status.
    // This will be calculated from the item/vendor statuses.
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },

    // Kept for compatibility with existing code.
    // Individual cancellation reasons are stored on order items.
    cancellationReason: {
      type: String,
      default: "",
    },

    paymentMethod: {
      type: String,
      enum: ["cod", "stripe", "razorpay"],
      default: "cod",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Order", orderSchema);
