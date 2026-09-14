import Chat from "../models/Chat.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

// Helper: get first admin user
const getAdminUser = async () => {
  return User.findOne({ role: "admin" }).select("_id name email");
};

// Customer starts (or continues) a chat with admin / support
export const startChat = async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Only customers can start a support chat",
      });
    }

    const { productId, message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const admin = await getAdminUser();
    if (!admin) {
      return res.status(500).json({
        message: "Support is not available right now (no admin account found)",
      });
    }

    let product = null;
    if (productId) {
      product = await Product.findById(productId);
      if (!product || !product.isPublished) {
        return res.status(404).json({ message: "Product not found" });
      }
    }

    // Existing chat: same customer + same product (or no product)
    const filter = {
      customer: req.user._id,
      admin: admin._id,
    };
    if (productId) {
      filter.product = productId;
    } else {
      filter.$or = [{ product: null }, { product: { $exists: false } }];
    }

    let chat = await Chat.findOne(
      productId
        ? { customer: req.user._id, admin: admin._id, product: productId }
        : {
            customer: req.user._id,
            admin: admin._id,
            $or: [{ product: null }, { product: { $exists: false } }],
          }
    );

    if (!chat) {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      chat = await Chat.create({
        customer: req.user._id,
        admin: admin._id,
        ...(productId ? { product: productId } : {}),
        messages: [
          {
            sender: req.user._id,
            text: message.trim(),
          },
        ],
        expiresAt,
      });
    } else {
      chat.messages.push({
        sender: req.user._id,
        text: message.trim(),
      });
      await chat.save();
    }

    const populated = await Chat.findById(chat._id)
      .populate("customer", "name")
      .populate("admin", "name")
      .populate("product", "title");

    res.status(201).json(populated);
  } catch (error) {
    console.error("Start chat error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Send a message — customer OR admin
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

    const isCustomer =
      chat.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }

    chat.messages.push({
      sender: req.user._id,
      text: text.trim(),
    });
    await chat.save();

    const populated = await Chat.findById(chat._id)
      .populate("customer", "name")
      .populate("admin", "name")
      .populate("product", "title");

    res.json(populated);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: error.message });
  }
};

// List chats — customer sees own, admin sees all
export const getMyChats = async (req, res) => {
  try {
    let chats;

    if (req.user.role === "customer") {
      chats = await Chat.find({ customer: req.user._id })
        .populate("admin", "name")
        .populate("product", "title images")
        .sort({ updatedAt: -1 });
    } else if (req.user.role === "admin") {
      chats = await Chat.find()
        .populate("customer", "name email")
        .populate("admin", "name")
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

// Single chat — customer (own) or any admin
export const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate("customer", "name email")
      .populate("admin", "name")
      .populate("product", "title images");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found or expired" });
    }

    const isCustomer =
      chat.customer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};