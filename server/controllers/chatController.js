import Chat from "../models/Chat.js";
import Vendor from "../models/Vendor.js";
import Product from "../models/Product.js";

// Customer starts (or continues) a chat with vendor about a product
export const startChat = async (req, res) => {
  try {
    const { productId, message } = req.body;

    if (!productId || !message?.trim()) {
      return res.status(400).json({ message: "Product and message are required" });
    }

    const product = await Product.findById(productId).populate("vendor");
    if (!product || !product.isPublished) {
      return res.status(404).json({ message: "Product not found" });
    }

    const vendor = product.vendor;
    if (!vendor || vendor.status !== "approved") {
      return res.status(400).json({ message: "Vendor not available" });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      customer: req.user._id,
      vendor: vendor._id,
      product: productId,
    });

    if (!chat) {
      // Create new chat that expires in 7 days
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      chat = await Chat.create({
        customer: req.user._id,
        vendor: vendor._id,
        product: productId,
        messages: [
          {
            sender: req.user._id,
            text: message.trim(),
          },
        ],
        expiresAt,
      });
    } else {
      // Add message to existing chat
      chat.messages.push({
        sender: req.user._id,
        text: message.trim(),
      });
      await chat.save();
    }

    const populated = await Chat.findById(chat._id)
      .populate("customer", "name")
      .populate("vendor", "storeName")
      .populate("product", "title");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send a message in an existing chat
export const sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found or expired" });
    }

    // Authorization: only the customer or the vendor owner can send
    const isCustomer = chat.customer.toString() === req.user._id.toString();
    const vendor = await Vendor.findById(chat.vendor);

    const isVendorOwner =
      vendor && vendor.user.toString() === req.user._id.toString();

    if (!isCustomer && !isVendorOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    chat.messages.push({
      sender: req.user._id,
      text: text.trim(),
    });

    await chat.save();

    const populated = await Chat.findById(chat._id)
      .populate("customer", "name")
      .populate("vendor", "storeName")
      .populate("product", "title");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get my chats (customer or vendor)
export const getMyChats = async (req, res) => {
  try {
    let chats;

    if (req.user.role === "customer") {
      chats = await Chat.find({ customer: req.user._id })
        .populate("vendor", "storeName logo")
        .populate("product", "title images")
        .sort({ updatedAt: -1 });
    } else if (req.user.role === "vendor") {
      const vendor = await Vendor.findOne({ user: req.user._id });
      if (!vendor) {
        return res.json([]);
      }

      chats = await Chat.find({ vendor: vendor._id })
        .populate("customer", "name")
        .populate("product", "title images")
        .sort({ updatedAt: -1 });
    } else {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single chat
export const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate("customer", "name")
      .populate("vendor", "storeName")
      .populate("product", "title images");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found or expired" });
    }

    // Authorization
    const isCustomer = chat.customer._id.toString() === req.user._id.toString();
    const vendor = await Vendor.findById(chat.vendor._id || chat.vendor);
    const isVendorOwner =
      vendor && vendor.user.toString() === req.user._id.toString();

    if (!isCustomer && !isVendorOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};