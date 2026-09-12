import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import Vendor from "../models/Vendor.js";

export const getAdminStats = async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders, totalCategories] =
      await Promise.all([
        User.countDocuments(),
        Product.countDocuments(),
        Order.countDocuments(),
        Category.countDocuments(),
      ]);

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalCategories,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVendorStats = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      user: req.user._id,
      status: "approved",
    });

    if (!vendor) {
      return res.status(403).json({ message: "Vendor not approved" });
    }

    const products = await Product.find({ vendor: vendor._id });

    const orders = await Order.find({ "items.vendor": vendor._id });

    let totalSales = 0;
    let pendingOrders = 0;

    orders.forEach((order) => {
      if (order.status === "cancelled") return;

      const vendorItems = order.items.filter(
        (item) => item.vendor.toString() === vendor._id.toString()
      );

      const subtotal = vendorItems.reduce(
        (sum, item) => sum + (item.subtotal || item.price * item.quantity),
        0
      );
      totalSales += subtotal;

      if (order.status === "pending" || order.status === "processing") {
        pendingOrders += 1;
      }
    });

    const lowStock = products.filter((p) => p.stock <= 5).length;

    res.json({
      totalSales,
      totalProducts: products.length,
      pendingOrders,
      lowStock,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPopularProducts = async (req, res) => {
  try {
    const products = await Product.find({ isPublished: true })
      .sort({ views: -1 })
      .limit(10)
      .populate("category", "name")
      .populate("vendor", "storeName")
      .select("title price images views stock category vendor");

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};