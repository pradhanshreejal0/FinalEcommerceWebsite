import ReturnRequest from "../models/ReturnRequest.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { notifyEmail } from "../utils/notify.js";

export const createReturnRequest = async (req, res) => {
  try {
    const { orderId, orderItemId, reason, details } = req.body;

    if (!orderId || !orderItemId || !reason?.trim()) {
      return res.status(400).json({
        message: "orderId, orderItemId, and reason are required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not your order" });
    }

    const item = order.items.id(orderItemId);
    if (!item) {
      return res.status(404).json({ message: "Order item not found" });
    }

    if (item.status !== "delivered") {
      return res.status(400).json({
        message: "Returns are only allowed for delivered items",
      });
    }

    const existing = await ReturnRequest.findOne({
      order: orderId,
      orderItemId,
      status: { $in: ["pending", "approved"] },
    });
    if (existing) {
      return res.status(400).json({ message: "Return already requested for this item" });
    }

    const request = await ReturnRequest.create({
      order: order._id,
      user: req.user._id,
      vendor: item.vendor,
      orderItemId: item._id,
      product: item.product,
      reason: reason.trim(),
      details: details || "",
      refundAmount: item.subtotal || 0,
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyReturns = async (req, res) => {
  try {
    const list = await ReturnRequest.find({ user: req.user._id })
      .populate("order", "orderNumber totalAmount")
      .populate("product", "title images")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVendorReturns = async (req, res) => {
  try {
    const Vendor = (await import("../models/Vendor.js")).default;
    const vendor = await Vendor.findOne({
      user: req.user._id,
      status: "approved",
    });
    if (!vendor) {
      return res.status(403).json({ message: "Vendor not approved" });
    }
    const list = await ReturnRequest.find({ vendor: vendor._id })
      .populate("order", "orderNumber")
      .populate("user", "name email")
      .populate("product", "title images")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllReturns = async (req, res) => {
  try {
    const list = await ReturnRequest.find()
      .populate("order", "orderNumber totalAmount")
      .populate("user", "name email")
      .populate("vendor", "storeName")
      .populate("product", "title")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateReturnStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const allowed = ["approved", "rejected", "refunded", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await ReturnRequest.findById(req.params.id)
      .populate("user", "email")
      .populate("order", "orderNumber");
    if (!request) {
      return res.status(404).json({ message: "Return request not found" });
    }

    request.status = status;
    if (adminNote != null) request.adminNote = adminNote;

    // Restock when approved/refunded
    if (
      (status === "approved" || status === "refunded") &&
      request.product
    ) {
      const order = await Order.findById(request.order);
      const item = order?.items?.id(request.orderItemId);
      const qty = item?.quantity || 1;
      await Product.findByIdAndUpdate(request.product, {
        $inc: { stock: qty },
      });
    }

    await request.save();

    if (request.user?.email) {
      notifyEmail({
        to: request.user.email,
        subject: `Return ${status} — order ${request.order?.orderNumber || ""}`,
        html: `<p>Your return request is now <strong>${status}</strong>.</p>
               <p>${request.adminNote || ""}</p>`,
      });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
