import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Vendor from "../models/Vendor.js";

// Customer: Place order from cart
export const createOrder = async (req, res) => {
  try {
    const {
      shippingAddress,
      paymentMethod = "cod",
    } = req.body;

    // Validate payment method
    const allowedPaymentMethods = [
      "cod",
      "stripe",
      "razorpay",
    ];

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    // Validate shipping address
    if (
      !shippingAddress?.fullName ||
      !shippingAddress?.phone ||
      !shippingAddress?.address ||
      !shippingAddress?.city
    ) {
      return res.status(400).json({
        message: "Complete shipping address is required",
      });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
    }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isPublished) {
        return res.status(400).json({
          message: `Product unavailable: ${
            product?.title || "Unknown"
          }`,
        });
      }

      // Snapshot the price the customer actually pays,
      // including any vendor discount active at checkout time.
      const effectivePrice =
        product.discountPercentage > 0
          ? Math.round(
              (product.price -
                (product.price * product.discountPercentage) / 100) *
                100
            ) / 100
          : product.price;

      const lineSubtotal = effectivePrice * Number(item.quantity);

      orderItems.push({
        product: product._id,
        vendor: product.vendor,
        title: product.title,
        price: effectivePrice,
        quantity: item.quantity,
        image: product.images?.[0] || "",
        subtotal: lineSubtotal,
        status: "pending",
        cancellationReason: "",
      });

      totalAmount += lineSubtotal;
    }

    const orderNumber = `ORD-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    const order = await Order.create({
      user: req.user._id,
      orderNumber,
      items: orderItems,
      shippingAddress,
      totalAmount,
      paymentMethod,
      paymentStatus: "pending",
      status: "pending",
    });

    // Clear cart after successful order
    cart.items = [];
    await cart.save();

    const populated = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("items.vendor", "storeName");

    res.status(201).json(populated);
  } catch (error) {
    console.error("Create order error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


// Customer: Get my orders
export const getMyOrders = async (req, res) => {
  try {
    const { status = "all" } = req.query;

    let query = {
      user: req.user._id,
    };

    // Filter orders by customer-facing section
    if (status === "active") {
      query.status = {
        $in: ["pending", "processing", "shipped"],
      };
    } else if (status === "completed") {
      query.status = "delivered";
    } else if (status === "cancelled") {
      query.status = "cancelled";
    }

    const orders = await Order.find(query)
      .populate(
        "items.vendor",
        "storeName storeSlug logo"
      )
      .populate(
        "items.product",
        "title price images"
      )
      .sort({
        createdAt: -1,
      });

    res.json(orders);
  } catch (error) {
    console.error("Get my orders error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


// Single order
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("items.vendor", "storeName storeSlug")
      .populate("items.product", "title images");

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const isOwner =
      order.user._id.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    let isVendor = false;

    if (req.user.role === "vendor") {
      const vendor = await Vendor.findOne({
        user: req.user._id,
      });

      if (vendor) {
        isVendor = order.items.some(
          (item) =>
            item.vendor?._id?.toString() ===
            vendor._id.toString()
        );
      }
    }

    if (!isOwner && !isAdmin && !isVendor) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// Vendor: Orders with their products
export const getVendorOrders = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      user: req.user._id,
      status: "approved",
    });

    if (!vendor) {
      return res.status(403).json({
        message: "Vendor not approved",
      });
    }

    const orders = await Order.find({
      "items.vendor": vendor._id,
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const filtered = orders.map((order) => {
      const items = order.items.filter(
        (item) =>
          item.vendor.toString() ===
          vendor._id.toString()
      );

      const subtotal = items.reduce(
        (sum, item) =>
          sum + Number(item.price) * Number(item.quantity),
        0
      );

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        items,
        subtotal,
        status: order.status,
        cancellationReason:
          order.cancellationReason || "",
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
      };
    });

    res.json(filtered);
  } catch (error) {
    console.error("Get vendor orders error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


// Vendor: Update status of their own order items
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason = "" } = req.body;

    const allowedStatuses = [
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    if (
      status === "cancelled" &&
      !cancellationReason.trim()
    ) {
      return res.status(400).json({
        message: "Cancellation reason is required",
      });
    }

    const vendor = await Vendor.findOne({
      user: req.user._id,
      status: "approved",
    });

    if (!vendor) {
      return res.status(403).json({
        message: "Approved vendor account required",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Find this vendor's items
    const vendorItems = order.items.filter(
      (item) =>
        item.vendor &&
        item.vendor.toString() === vendor._id.toString()
    );

    if (vendorItems.length === 0) {
      return res.status(403).json({
        message: "You are not a vendor for this order",
      });
    }

    // Update ONLY this vendor's items
    for (const item of vendorItems) {
      item.status = status;

      if (status === "cancelled") {
        item.cancellationReason = cancellationReason.trim();
      } else {
        item.cancellationReason = "";
      }
    }

    /*
     * Calculate the overall order status.
     *
     * Rules:
     *
     * All cancelled       -> cancelled
     * All delivered       -> delivered
     * Any shipped         -> shipped
     * Any processing      -> processing
     * Otherwise            -> pending
     */

    const itemStatuses = order.items.map(
      (item) => item.status
    );

    if (
      itemStatuses.length > 0 &&
      itemStatuses.every(
        (itemStatus) => itemStatus === "cancelled"
      )
    ) {
      order.status = "cancelled";
    } else if (
      itemStatuses.length > 0 &&
      itemStatuses.every(
        (itemStatus) =>
          itemStatus === "delivered" ||
          itemStatus === "cancelled"
      ) &&
      itemStatuses.some(
        (itemStatus) => itemStatus === "delivered"
      )
    ) {
      // Everything has finished, with at least one delivered item
      order.status = "delivered";
    } else if (
      itemStatuses.some(
        (itemStatus) => itemStatus === "shipped"
      )
    ) {
      order.status = "shipped";
    } else if (
      itemStatuses.some(
        (itemStatus) => itemStatus === "processing"
      )
    ) {
      order.status = "processing";
    } else {
      order.status = "pending";
    }

    // Keep the old top-level cancellationReason useful
    // for compatibility with existing frontend code.
    if (order.status === "cancelled") {
      const reasons = order.items
        .filter(
          (item) =>
            item.status === "cancelled" &&
            item.cancellationReason
        )
        .map((item) => item.cancellationReason);

      order.cancellationReason = reasons.join("; ");
    } else {
      order.cancellationReason = "";
    }

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("items.vendor", "storeName storeSlug logo")
      .populate(
        "items.product",
        "title price images"
      );

    res.json(updatedOrder);
  } catch (error) {
    console.error("Update order status error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


// Admin: All orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.vendor", "storeName")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Get all orders error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};