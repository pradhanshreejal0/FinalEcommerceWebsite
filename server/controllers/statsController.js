import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import Vendor from "../models/Vendor.js";
import Settings from "../models/Settings.js";

export const getAdminStats = async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders, totalCategories, settings] =
      await Promise.all([
        User.countDocuments(),
        Product.countDocuments(),
        Order.countDocuments(),
        Category.countDocuments(),
        Settings.getSingleton(),
      ]);

    // Platform cut = sum of platformCommission on non-cancelled orders
    const commissionAgg = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalPlatformCommission: { $sum: "$platformCommission" },
          totalSalesSubtotal: { $sum: "$subtotal" },
          totalOrderValue: { $sum: "$totalAmount" },
          paidOrders: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const agg = commissionAgg[0] || {};

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalCategories,
      commissionPercentage: settings.commissionPercentage ?? 10,
      // Admin earnings from sales (product subtotal × commission %)
      totalPlatformCommission: Math.round((agg.totalPlatformCommission || 0) * 100) / 100,
      totalSalesSubtotal: Math.round((agg.totalSalesSubtotal || 0) * 100) / 100,
      totalOrderValue: Math.round((agg.totalOrderValue || 0) * 100) / 100,
      paidOrders: agg.paidOrders || 0,
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
    let totalEarnings = 0; // after platform commission
    let totalCommissionDeducted = 0;
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

      const earnings = vendorItems.reduce(
        (sum, item) =>
          sum +
          (item.vendorEarnings != null
            ? item.vendorEarnings
            : (item.subtotal || item.price * item.quantity) *
              (1 - (order.commissionPercentage || 0) / 100)),
        0
      );
      totalEarnings += earnings;

      const commission = vendorItems.reduce(
        (sum, item) =>
          sum +
          (item.platformCommission != null
            ? item.platformCommission
            : (item.subtotal || item.price * item.quantity) *
              ((order.commissionPercentage || 0) / 100)),
        0
      );
      totalCommissionDeducted += commission;

      if (order.status === "pending" || order.status === "processing") {
        pendingOrders += 1;
      }
    });

    const lowStock = products.filter((p) => p.stock <= 5).length;

    res.json({
      totalSales: Math.round(totalSales * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalCommissionDeducted: Math.round(totalCommissionDeducted * 100) / 100,
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
