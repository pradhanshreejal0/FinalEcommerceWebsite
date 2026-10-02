import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Vendor from "../models/Vendor.js";
import Settings from "../models/Settings.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import { notifyEmail, orderSummaryHtml } from "../utils/notify.js";
import { httpError } from "../utils/httpError.js";

/**
 * Decrement product + variant stock atomically.
 * items: [{ product, quantity, title?, variantKey? }]
 * Throws with statusCode 400 if any line lacks stock.
 * On partial failure, rolls back already-reserved lines.
 */
async function reserveStock(items) {
  const reserved = [];
  try {
    for (const { product, quantity, title, variantKey } of items) {
      const productId = product._id || product;
      const qty = Number(quantity) || 0;
      if (qty <= 0) continue;

      const key = String(variantKey || "").trim();
      let updated;

      if (key) {
        // Variant product: decrement both total stock and the matching variant
        updated = await Product.findOneAndUpdate(
          {
            _id: productId,
            stock: { $gte: qty },
            variants: {
              $elemMatch: { key, stock: { $gte: qty } },
            },
          },
          {
            $inc: {
              stock: -qty,
              "variants.$[v].stock": -qty,
            },
          },
          {
            arrayFilters: [{ "v.key": key }],
            new: true,
          }
        );
      } else {
        updated = await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { new: true }
        );
      }

      if (!updated) {
        throw httpError(`Insufficient stock for "${title || product.title || "product"}"${
            key ? ` (${key})` : ""
          }`);
      }
      reserved.push({ productId, quantity: qty, variantKey: key });
    }
  } catch (err) {
    // Best-effort rollback of already-reserved lines
    for (const r of reserved.reverse()) {
      try {
        if (r.variantKey) {
          await Product.findOneAndUpdate(
            { _id: r.productId, "variants.key": r.variantKey },
            {
              $inc: {
                stock: r.quantity,
                "variants.$[v].stock": r.quantity,
              },
            },
            { arrayFilters: [{ "v.key": r.variantKey }] }
          );
        } else {
          await Product.findByIdAndUpdate(r.productId, {
            $inc: { stock: r.quantity },
          });
        }
      } catch (_) {
        /* ignore rollback errors */
      }
    }
    throw err;
  }
  return reserved;
}

/**
 * Restore product + variant stock for cancelled line items
 * that have not been restored yet. Sets item.stockRestored = true.
 */
async function restoreStockForItems(orderItems) {
  for (const item of orderItems) {
    if (item.stockRestored) continue;
    if (item.status !== "cancelled") continue;
    const qty = Number(item.quantity) || 0;
    if (qty <= 0 || !item.product) continue;

    const key = String(item.variantKey || "").trim();
    if (key) {
      await Product.findOneAndUpdate(
        { _id: item.product, "variants.key": key },
        {
          $inc: {
            stock: qty,
            "variants.$[v].stock": qty,
          },
        },
        { arrayFilters: [{ "v.key": key }] }
      );
    } else {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: qty },
      });
    }
    item.stockRestored = true;
  }
}

function computeCouponDiscount(coupon, subtotal) {
  if (!coupon || !coupon.isCurrentlyValid()) return 0;
  if (subtotal < (coupon.minOrderAmount || 0)) return 0;
  let discount = 0;
  if (coupon.discountType === "fixed") {
    discount = Number(coupon.discountValue) || 0;
  } else {
    discount = (subtotal * (Number(coupon.discountValue) || 0)) / 100;
    if (coupon.maxDiscount != null) {
      discount = Math.min(discount, Number(coupon.maxDiscount));
    }
  }
  return Math.round(Math.min(discount, subtotal) * 100) / 100;
}

// =====================================================
// Delivery Configuration
// =====================================================
//
// Delivery is calculated per vendor.
//
// 0 - 3 km       = RS 50
// >3 - 7 km      = RS 150
// >7 - 12 km     = RS 250
// >12 km         = RS 350
// =====================================================

const DELIVERY_RATES = {
  upTo3Km: 50,
  upTo7Km: 150,
  upTo12Km: 250,
  above12Km: 350,
};

// =====================================================
// Order Status Transitions
// =====================================================
//
// pending -> processing -> shipped -> delivered
// cancelled allowed from pending or processing only
// =====================================================

const ALLOWED_STATUS_TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

// =====================================================
// Helpers
// =====================================================

const roundMoney = (value) => {
  return Math.round(Number(value) * 100) / 100;
};

const validateCoordinates = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  if (lat < -90 || lat > 90) {
    return false;
  }

  if (lng < -180 || lng > 180) {
    return false;
  }

  return true;
};

const calculateDistanceKm = (
  latitude1,
  longitude1,
  latitude2,
  longitude2
) => {
  const earthRadiusKm = 6371;

  const toRadians = (degrees) => {
    return (degrees * Math.PI) / 180;
  };

  const lat1 = toRadians(latitude1);
  const lat2 = toRadians(latitude2);

  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLongitude / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const calculateDeliveryFee = (distanceKm) => {
  if (distanceKm <= 3) {
    return DELIVERY_RATES.upTo3Km;
  }

  if (distanceKm <= 7) {
    return DELIVERY_RATES.upTo7Km;
  }

  if (distanceKm <= 12) {
    return DELIVERY_RATES.upTo12Km;
  }

  return DELIVERY_RATES.above12Km;
};

const validateShippingAddress = (shippingAddress) => {
  if (
    !shippingAddress?.fullName ||
    !shippingAddress?.phone ||
    !shippingAddress?.address ||
    !shippingAddress?.city ||
    !shippingAddress?.country
  ) {
    return "Complete shipping address is required";
  }

  const { latitude, longitude } = shippingAddress;

  if (!validateCoordinates(latitude, longitude)) {
    return "Valid delivery latitude and longitude are required";
  }

  return null;
};

// Shared populate helper so path always matches Order schema
const populateOrder = (query) => {
  return query
    .populate("user", "name email")
    .populate("items.vendor", "storeName storeSlug logo location")
    .populate("items.product", "title price images")
    .populate({
      path: "delivery.vendors.vendor",
      select: "storeName storeSlug logo location",
      strictPopulate: false,
    });
};

// =====================================================
// Get Cart + Validate Products + Vendors
// =====================================================

const getValidatedCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");

  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    throw httpError("Cart is empty");
  }

  const validatedItems = [];

  for (const item of cart.items) {
    const product = item.product;

    if (!product || !product.isPublished) {
      throw httpError(`Product unavailable: ${product?.title || "Unknown"}`);
    }

    if (!product.vendor) {
      throw httpError(`Product has no valid vendor: ${product.title}`);
    }

    const vendor = await Vendor.findOne({
      _id: product.vendor,
      status: "approved",
    });

    if (!vendor) {
      throw httpError(`Vendor is not currently approved for product: ${product.title}`);
    }

    if (
      !vendor.location ||
      !validateCoordinates(
        vendor.location.latitude,
        vendor.location.longitude
      )
    ) {
      throw httpError(`Vendor location is not configured: ${vendor.storeName}`);
    }

    const quantity = Number(item.quantity);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isInteger(quantity)
    ) {
      throw httpError(`Invalid quantity for product: ${product.title}`);
    }

    const variantKey = String(item.variantKey || "").trim();
    let variantLabel = String(item.variantLabel || "").trim();
    let availableStock = Number(product.stock);
    let basePrice = Number(product.price);

    if (product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0) {
      if (!variantKey) {
        throw httpError(`Please select an option for "${product.title}"`);
      }
      const match = product.variants.find((v) => v.key === variantKey);
      if (!match) {
        throw httpError(`Selected option is unavailable for "${product.title}"`);
      }
      availableStock = Number(match.stock);
      basePrice = Number(match.price);
      variantLabel = match.label || variantKey;
    }

    if (availableStock < quantity) {
      throw httpError(`Insufficient stock for "${product.title}"${variantLabel ? ` (${variantLabel})` : ""} (available: ${availableStock})`);
    }

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      throw httpError(`Invalid price for product: ${product.title}`);
    }

    let discount = Number(product.discountPercentage || 0);

    if (!Number.isFinite(discount)) {
      discount = 0;
    }

    discount = Math.min(Math.max(discount, 0), 100);

    const effectivePrice = roundMoney(
      basePrice - (basePrice * discount) / 100
    );

    const lineSubtotal = roundMoney(effectivePrice * quantity);

    validatedItems.push({
      item,
      product,
      vendor,
      quantity,
      effectivePrice,
      lineSubtotal,
      variantKey,
      variantLabel,
    });
  }

  return {
    cart,
    items: validatedItems,
  };
};

// =====================================================
// Calculate Order Pricing
// =====================================================

const calculateOrderPricing = ({
  items,
  customerLatitude,
  customerLongitude,
}) => {
  const vendorMap = new Map();
  let subtotal = 0;

  for (const item of items) {
    subtotal += item.lineSubtotal;

    const vendorId = item.vendor._id.toString();

    if (!vendorMap.has(vendorId)) {
      vendorMap.set(vendorId, item.vendor);
    }
  }

  subtotal = roundMoney(subtotal);

  const deliveryVendors = [];
  let totalDeliveryFee = 0;

  for (const vendor of vendorMap.values()) {
    const distanceKm = calculateDistanceKm(
      customerLatitude,
      customerLongitude,
      vendor.location.latitude,
      vendor.location.longitude
    );

    const roundedDistance = Math.round(distanceKm * 100) / 100;
    const fee = calculateDeliveryFee(roundedDistance);

    deliveryVendors.push({
      vendor: vendor._id,
      distanceKm: roundedDistance,
      fee,
    });

    totalDeliveryFee += fee;
  }

  totalDeliveryFee = roundMoney(totalDeliveryFee);

  const totalAmount = roundMoney(subtotal + totalDeliveryFee);

  return {
    subtotal,
    deliveryFee: totalDeliveryFee,
    totalAmount,
    delivery: {
      totalFee: totalDeliveryFee,
      vendors: deliveryVendors,
    },
  };
};

// =====================================================
// Customer: Delivery Quote
// =====================================================

export const getDeliveryQuote = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!validateCoordinates(latitude, longitude)) {
      return res.status(400).json({
        message: "Valid delivery latitude and longitude are required",
      });
    }

    const { items } = await getValidatedCart(req.user._id);

    const pricing = calculateOrderPricing({
      items,
      customerLatitude: Number(latitude),
      customerLongitude: Number(longitude),
    });

    return res.json({
      subtotal: pricing.subtotal,
      deliveryFee: pricing.deliveryFee,
      totalAmount: pricing.totalAmount,
      delivery: pricing.delivery,
    });
  } catch (error) {
    console.error("Get delivery quote error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to calculate delivery quote",
    });
  }
};

// =====================================================
// Customer: Place Order
// =====================================================

export const createOrder = async (req, res) => {
  try {
    const {
      shippingAddress,
      paymentMethod = "cod",
      couponCode = "",
    } = req.body;

    const allowedPaymentMethods = ["cod", "esewa", "khalti"];

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method. Use cod, esewa, or khalti.",
      });
    }

    const shippingError = validateShippingAddress(shippingAddress);

    if (shippingError) {
      return res.status(400).json({
        message: shippingError,
      });
    }

    const customerLatitude = Number(shippingAddress.latitude);
    const customerLongitude = Number(shippingAddress.longitude);

    const { cart, items } = await getValidatedCart(req.user._id);

    // Admin platform cut — from Settings.commissionPercentage (default 10%)
    const settings = await Settings.getSingleton();
    const commissionPercentage = Number(settings.commissionPercentage) || 0;
    const rate = Math.min(100, Math.max(0, commissionPercentage)) / 100;

    const orderItems = items.map(
      ({ product, vendor, quantity, effectivePrice, lineSubtotal, variantKey, variantLabel }) => {
        const lineCommission = Math.round(lineSubtotal * rate * 100) / 100;
        const lineVendorEarnings =
          Math.round((lineSubtotal - lineCommission) * 100) / 100;
        return {
          product: product._id,
          vendor: vendor._id,
          title: product.title,
          price: effectivePrice,
          quantity,
          image: product.images?.[0] || "",
          variantKey: variantKey || "",
          variantLabel: variantLabel || "",
          subtotal: lineSubtotal,
          platformCommission: lineCommission,
          vendorEarnings: lineVendorEarnings,
          status: "pending",
          cancellationReason: "",
        };
      }
    );

    const pricing = calculateOrderPricing({
      items,
      customerLatitude,
      customerLongitude,
    });

    const platformCommission =
      Math.round(
        orderItems.reduce((s, i) => s + (i.platformCommission || 0), 0) * 100
      ) / 100;
    const vendorEarnings =
      Math.round(
        orderItems.reduce((s, i) => s + (i.vendorEarnings || 0), 0) * 100
      ) / 100;

    // Optional promo code (platform-wide or matching vendor)
    let discountAmount = 0;
    let appliedCoupon = null;
    const code = String(couponCode || "").trim().toUpperCase();
    if (code) {
      const coupon = await Coupon.findOne({ code });
      if (!coupon || !coupon.isCurrentlyValid()) {
        return res.status(400).json({ message: "Invalid or expired coupon code" });
      }
      discountAmount = computeCouponDiscount(coupon, pricing.subtotal);
      if (discountAmount <= 0) {
        return res.status(400).json({
          message: `Coupon requires minimum order of RS ${coupon.minOrderAmount || 0}`,
        });
      }
      appliedCoupon = coupon;
    }

    const totalAmount = Math.round(
      (pricing.subtotal - discountAmount + pricing.deliveryFee) * 100
    ) / 100;

    // Reserve inventory before creating the order
    const reservedLines = await reserveStock(
      items.map(({ product, quantity, variantKey }) => ({
        product,
        quantity,
        title: product.title,
        variantKey: variantKey || "",
      }))
    );

    // Atomically consume coupon usage limit (prevents concurrent over-use)
    if (appliedCoupon) {
      const couponFilter = {
        _id: appliedCoupon._id,
        isActive: true,
      };
      if (appliedCoupon.usageLimit != null) {
        couponFilter.usedCount = { $lt: appliedCoupon.usageLimit };
      }
      const couponUpdated = await Coupon.findOneAndUpdate(
        couponFilter,
        { $inc: { usedCount: 1 } },
        { new: true }
      );
      if (!couponUpdated) {
        // Roll back stock and reject
        for (const r of reservedLines.reverse()) {
          try {
            if (r.variantKey) {
              await Product.findOneAndUpdate(
                { _id: r.productId, "variants.key": r.variantKey },
                {
                  $inc: {
                    stock: r.quantity,
                    "variants.$[v].stock": r.quantity,
                  },
                },
                { arrayFilters: [{ "v.key": r.variantKey }] }
              );
            } else {
              await Product.findByIdAndUpdate(r.productId, {
                $inc: { stock: r.quantity },
              });
            }
          } catch (_) {}
        }
        return res.status(400).json({
          message: "Coupon usage limit reached",
        });
      }
    }

    let order;
    try {
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      order = await Order.create({
        user: req.user._id,
        orderNumber,
        items: orderItems,
        shippingAddress: {
          fullName: shippingAddress.fullName.trim(),
          phone: shippingAddress.phone.trim(),
          address: shippingAddress.address.trim(),
          city: shippingAddress.city.trim(),
          postalCode: String(shippingAddress.postalCode || "").trim(),
          country: shippingAddress.country.trim(),
          latitude: customerLatitude,
          longitude: customerLongitude,
        },
        subtotal: pricing.subtotal,
        deliveryFee: pricing.deliveryFee,
        discountAmount,
        totalAmount,
        delivery: pricing.delivery,
        commissionPercentage,
        platformCommission,
        vendorEarnings,
        couponCode: appliedCoupon ? appliedCoupon.code : "",
        coupon: appliedCoupon ? appliedCoupon._id : null,
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
        status: "pending",
        stockReserved: true,
      });

      cart.items = [];
      await cart.save();
    } catch (createErr) {
      // Roll back stock (and coupon usage) if order/cart write fails
      for (const r of reservedLines.reverse()) {
        try {
          if (r.variantKey) {
            await Product.findOneAndUpdate(
              { _id: r.productId, "variants.key": r.variantKey },
              {
                $inc: {
                  stock: r.quantity,
                  "variants.$[v].stock": r.quantity,
                },
              },
              { arrayFilters: [{ "v.key": r.variantKey }] }
            );
          } else {
            await Product.findByIdAndUpdate(r.productId, {
              $inc: { stock: r.quantity },
            });
          }
        } catch (_) {}
      }
      if (appliedCoupon) {
        try {
          await Coupon.findByIdAndUpdate(appliedCoupon._id, {
            $inc: { usedCount: -1 },
          });
        } catch (_) {}
      }
      throw createErr;
    }

    const populated = await populateOrder(Order.findById(order._id));

    // Notify customer (non-blocking)
    notifyEmail({
      to: req.user.email,
      subject: `Order placed — ${order.orderNumber}`,
      html: orderSummaryHtml(order, "Thanks for your order!"),
    });

    // Notify each vendor for their items
    const vendorIds = [
      ...new Set(orderItems.map((i) => String(i.vendor))),
    ];
    for (const vid of vendorIds) {
      const v = await Vendor.findById(vid).populate("user", "email");
      if (v?.user?.email) {
        notifyEmail({
          to: v.user.email,
          subject: `New order ${order.orderNumber}`,
          html: orderSummaryHtml(order, `New order for ${v.storeName}`),
        });
      }
    }

    return res.status(201).json(populated);
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to create order",
    });
  }
};

// =====================================================
// Customer: Get My Orders
// =====================================================

export const getMyOrders = async (req, res) => {
  try {
    const { status = "all" } = req.query;

    const query = {
      user: req.user._id,
    };

    if (status === "active") {
      query.status = {
        $in: ["pending", "processing", "shipped"],
      };
    } else if (status === "completed") {
      query.status = "delivered";
    } else if (status === "cancelled") {
      query.status = "cancelled";
    }

    const orders = await populateOrder(
      Order.find(query).sort({ createdAt: -1 })
    );

    return res.json(orders);
  } catch (error) {
    console.error("Get my orders error:", error);

    return res.status(500).json({
      message: error.message || "Failed to get orders",
    });
  }
};

// =====================================================
// Get Single Order
// =====================================================

export const getOrderById = async (req, res) => {
  try {
    const order = await populateOrder(Order.findById(req.params.id));

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const isOwner =
      order.user &&
      order.user._id.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    let isVendor = false;

    if (req.user.role === "vendor") {
      const vendor = await Vendor.findOne({ user: req.user._id });

      if (vendor) {
        isVendor = order.items.some(
          (item) =>
            item.vendor?._id?.toString() === vendor._id.toString()
        );
      }
    }

    if (!isOwner && !isAdmin && !isVendor) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    return res.json(order);
  } catch (error) {
    console.error("Get order error:", error);

    return res.status(500).json({
      message: error.message || "Failed to get order",
    });
  }
};

// =====================================================
// Vendor: Get Orders
// =====================================================

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
      .populate("items.product", "title images price")
      .sort({ createdAt: -1 });

    const filtered = orders.map((order) => {
      const items = order.items.filter(
        (item) =>
          item.vendor && item.vendor.toString() === vendor._id.toString()
      );

      const subtotal = items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.subtotal || Number(item.price) * Number(item.quantity)
          ),
        0
      );

      const deliveryInfo = order.delivery?.vendors?.find(
        (deliveryVendor) =>
          deliveryVendor.vendor?.toString() === vendor._id.toString()
      );

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        items,
        subtotal: roundMoney(subtotal),
        deliveryFee: deliveryInfo?.fee || 0,
        deliveryDistanceKm: deliveryInfo?.distanceKm || 0,
        status: order.status,
        cancellationReason: order.cancellationReason || "",
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
      };
    });

    return res.json(filtered);
  } catch (error) {
    console.error("Get vendor orders error:", error);

    return res.status(500).json({
      message: error.message || "Failed to get vendor orders",
    });
  }
};

// =====================================================
// Vendor: Update Order Status
// =====================================================

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      cancellationReason = "",
      trackingNumber = "",
    } = req.body;

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

    if (status === "cancelled" && !String(cancellationReason).trim()) {
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

    const vendorItems = order.items.filter(
      (item) =>
        item.vendor && item.vendor.toString() === vendor._id.toString()
    );

    if (vendorItems.length === 0) {
      return res.status(403).json({
        message: "You are not a vendor for this order",
      });
    }

    for (const item of vendorItems) {
      const allowedNextStatuses =
        ALLOWED_STATUS_TRANSITIONS[item.status] || [];

      if (!allowedNextStatuses.includes(status)) {
        return res.status(400).json({
          message: `Cannot change "${item.title}" from "${item.status}" to "${status}"`,
        });
      }
    }

    for (const item of vendorItems) {
      item.status = status;

      if (status === "cancelled") {
        item.cancellationReason = String(cancellationReason).trim();
      } else {
        item.cancellationReason = "";
      }

      if (status === "shipped" && String(trackingNumber).trim()) {
        item.trackingNumber = String(trackingNumber).trim();
      }
    }

    // Restore stock for newly cancelled vendor lines
    if (status === "cancelled") {
      await restoreStockForItems(vendorItems);
    }

    const itemStatuses = order.items.map((item) => item.status);

    if (
      itemStatuses.length > 0 &&
      itemStatuses.every((itemStatus) => itemStatus === "cancelled")
    ) {
      order.status = "cancelled";
    } else if (
      itemStatuses.length > 0 &&
      itemStatuses.every(
        (itemStatus) =>
          itemStatus === "delivered" || itemStatus === "cancelled"
      ) &&
      itemStatuses.some((itemStatus) => itemStatus === "delivered")
    ) {
      order.status = "delivered";
    } else if (itemStatuses.some((itemStatus) => itemStatus === "shipped")) {
      order.status = "shipped";
    } else if (
      itemStatuses.some((itemStatus) => itemStatus === "processing")
    ) {
      order.status = "processing";
    } else {
      order.status = "pending";
    }

    if (order.status === "cancelled") {
      const reasons = order.items
        .filter(
          (item) =>
            item.status === "cancelled" && item.cancellationReason
        )
        .map((item) => item.cancellationReason);

      order.cancellationReason = reasons.join("; ");
    } else {
      order.cancellationReason = "";
    }

    await order.save();

    const updatedOrder = await populateOrder(Order.findById(order._id));

    // Email customer on status change
    try {
      const customer = await User.findById(order.user).select("email");
      if (customer?.email) {
        notifyEmail({
          to: customer.email,
          subject: `Order ${order.orderNumber} — ${status}`,
          html: orderSummaryHtml(
            order,
            `Your order is now: ${status}${
              trackingNumber
                ? ` (tracking: ${String(trackingNumber).trim()})`
                : ""
            }`
          ),
        });
      }
    } catch {
      /* ignore */
    }

    return res.json(updatedOrder);
  } catch (error) {
    console.error("Update order status error:", error);

    return res.status(500).json({
      message: error.message || "Failed to update order status",
    });
  }
};

// =====================================================
// Admin: Get All Orders
// =====================================================

export const getAllOrders = async (req, res) => {
  try {
    const orders = await populateOrder(
      Order.find().sort({ createdAt: -1 })
    );

    return res.json(orders);
  } catch (error) {
    console.error("Get all orders error:", error);

    return res.status(500).json({
      message: error.message || "Failed to get all orders",
    });
  }
};
