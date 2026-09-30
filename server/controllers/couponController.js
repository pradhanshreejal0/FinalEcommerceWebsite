import Coupon from "../models/Coupon.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

export const listCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      perUserLimit,
      startsAt,
      expiresAt,
      isActive,
    } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ message: "Invalid discount value" });
    }

    const coupon = await Coupon.create({
      code: String(code).trim().toUpperCase(),
      description: description || "",
      discountType: discountType === "fixed" ? "fixed" : "percent",
      discountValue: value,
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: maxDiscount != null ? Number(maxDiscount) : null,
      usageLimit: usageLimit != null ? Number(usageLimit) : null,
      perUserLimit: perUserLimit != null ? Number(perUserLimit) : 1,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive !== false,
    });

    res.status(201).json(coupon);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    const fields = [
      "description",
      "discountType",
      "discountValue",
      "minOrderAmount",
      "maxDiscount",
      "usageLimit",
      "perUserLimit",
      "startsAt",
      "expiresAt",
      "isActive",
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) coupon[f] = req.body[f];
    }
    if (req.body.code) coupon.code = String(req.body.code).trim().toUpperCase();

    await coupon.save();
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json({ message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Preview coupon against current cart (customer). */
export const validateCoupon = async (req, res) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ message: "Code required" });

    const coupon = await Coupon.findOne({ code });
    if (!coupon || !coupon.isCurrentlyValid()) {
      return res.status(400).json({ message: "Invalid or expired coupon" });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    let subtotal = 0;
    if (cart?.items?.length) {
      for (const item of cart.items) {
        const p = item.product;
        if (!p) continue;
        let price = Number(p.price) || 0;
        const d = Number(p.discountPercentage) || 0;
        if (d > 0) price = price - (price * d) / 100;
        subtotal += price * (item.quantity || 0);
      }
    }
    subtotal = Math.round(subtotal * 100) / 100;

    if (subtotal < (coupon.minOrderAmount || 0)) {
      return res.status(400).json({
        message: `Minimum order RS ${coupon.minOrderAmount} required`,
        minOrderAmount: coupon.minOrderAmount,
      });
    }

    let discount = 0;
    if (coupon.discountType === "fixed") {
      discount = coupon.discountValue;
    } else {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount != null) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    }
    discount = Math.round(Math.min(discount, subtotal) * 100) / 100;

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: discount,
      subtotal,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
