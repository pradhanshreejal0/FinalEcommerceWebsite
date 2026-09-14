import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Admin / page owner (User with role "admin")
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Optional: product the customer is asking about
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    messages: [messageSchema],
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // auto-delete after this date
    },
  },
  { timestamps: true }
);

// One open chat per customer + product (or general support without product)
chatSchema.index({ customer: 1, product: 1 });

export default mongoose.model("Chat", chatSchema);