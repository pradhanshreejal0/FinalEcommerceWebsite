import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import Vendor from "../models/Vendor.js";
import Settings from "../models/Settings.js";
import { buildAdminReport, buildVendorReport } from "../utils/reportPdf.js";

const round = (value) => Math.round(Number(value || 0) * 100) / 100;

function getPeriod(req) {
  const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
  const start = req.query.startDate
    ? new Date(req.query.startDate)
    : new Date(end.getFullYear(), end.getMonth() - 5, 1);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const error = new Error("Invalid report date range");
    error.status = 400;
    throw error;
  }

  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function monthLabel(value) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export const getAdminStats = async (req, res) => {
  try {
    const { start, end } = getPeriod(req);
    const [totalUsers, totalProducts, totalOrders, totalCategories, totalVendors, settings, aggregate, monthly, orderStatus, topProducts] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Category.countDocuments(),
      Vendor.countDocuments({ status: "approved" }),
      Settings.getSingleton(),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
        { $group: {
          _id: null,
          totalPlatformCommission: { $sum: "$platformCommission" },
          totalSalesSubtotal: { $sum: "$subtotal" },
          totalOrderValue: { $sum: "$totalAmount" },
          paidOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
        } },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
        { $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          sales: { $sum: "$subtotal" },
          commission: { $sum: "$platformCommission" },
          orders: { $sum: 1 },
        } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: "$status", orders: { $sum: 1 }, value: { $sum: "$totalAmount" } } },
        { $sort: { orders: -1 } },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        { $group: {
          _id: "$items.product",
          title: { $first: "$items.title" },
          units: { $sum: "$items.quantity" },
          sales: { $sum: { $ifNull: ["$items.subtotal", { $multiply: ["$items.price", "$items.quantity"] }] } },
        } },
        { $sort: { sales: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const agg = aggregate[0] || {};
    const monthlyMap = new Map(monthly.map((row) => [
      `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
      row,
    ]));
    const monthlySeries = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= last) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      const row = monthlyMap.get(key);
      monthlySeries.push({
        label: monthLabel(cursor),
        sales: round(row?.sales),
        commission: round(row?.commission),
        orders: row?.orders || 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    res.json({
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      totalUsers,
      totalProducts,
      totalOrders,
      totalCategories,
      totalVendors,
      commissionPercentage: settings.commissionPercentage ?? 10,
      totalPlatformCommission: round(agg.totalPlatformCommission),
      totalSalesSubtotal: round(agg.totalSalesSubtotal),
      totalOrderValue: round(agg.totalOrderValue),
      paidOrders: agg.paidOrders || 0,
      monthlySales: monthlySeries,
      orderStatus: orderStatus.map((row) => ({
        status: row._id,
        orders: row.orders,
        value: round(row.value),
      })),
      topProducts: topProducts.map((row) => ({
        title: row.title,
        units: row.units,
        sales: round(row.sales),
      })),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

export const getVendorStats = async (req, res) => {
  try {
    const { start, end } = getPeriod(req);
    const vendor = await Vendor.findOne({ user: req.user._id, status: "approved" }).lean();

    if (!vendor) {
      return res.status(403).json({ message: "Vendor not approved" });
    }

    const [productCount, lowStock, aggregate, monthly, topProducts, orderStatus] = await Promise.all([
      Product.countDocuments({ vendor: vendor._id }),
      Product.countDocuments({ vendor: vendor._id, stock: { $lte: 5 } }),
      Order.aggregate([
        { $match: { "items.vendor": vendor._id, status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        { $match: { "items.vendor": vendor._id, "items.status": { $ne: "cancelled" } } },
        { $group: {
          _id: null,
          totalSales: { $sum: { $ifNull: ["$items.subtotal", { $multiply: ["$items.price", "$items.quantity"] }] } },
          totalEarnings: { $sum: { $ifNull: ["$items.vendorEarnings", 0] } },
          totalCommission: { $sum: { $ifNull: ["$items.platformCommission", 0] } },
          totalUnits: { $sum: "$items.quantity" },
          orderIds: { $addToSet: "$_id" },
        } },
      ]),
      Order.aggregate([
        { $match: { "items.vendor": vendor._id, status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        { $match: { "items.vendor": vendor._id, "items.status": { $ne: "cancelled" } } },
        { $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          sales: { $sum: { $ifNull: ["$items.subtotal", { $multiply: ["$items.price", "$items.quantity"] }] } },
          earnings: { $sum: { $ifNull: ["$items.vendorEarnings", 0] } },
          orders: { $addToSet: "$_id" },
        } },
        { $project: { _id: 1, sales: 1, earnings: 1, orders: { $size: "$orders" } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Order.aggregate([
        { $match: { "items.vendor": vendor._id, status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        { $match: { "items.vendor": vendor._id, "items.status": { $ne: "cancelled" } } },
        { $group: {
          _id: "$items.product",
          title: { $first: "$items.title" },
          units: { $sum: "$items.quantity" },
          sales: { $sum: { $ifNull: ["$items.subtotal", { $multiply: ["$items.price", "$items.quantity"] }] } },
        } },
        { $sort: { sales: -1 } },
        { $limit: 8 },
      ]),
      Order.aggregate([
        { $match: { "items.vendor": vendor._id, createdAt: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        { $match: { "items.vendor": vendor._id } },
        { $group: { _id: "$status", orders: { $addToSet: "$_id" }, value: { $sum: { $ifNull: ["$items.subtotal", 0] } } } },
        { $project: { _id: 1, orders: { $size: "$orders" }, value: 1 } },
        { $sort: { orders: -1 } },
      ]),
    ]);

    const agg = aggregate[0] || {};
    const monthlyMap = new Map(monthly.map((row) => [
      `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
      row,
    ]));
    const monthlySeries = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= last) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      const row = monthlyMap.get(key);
      monthlySeries.push({
        label: monthLabel(cursor),
        sales: round(row?.sales),
        earnings: round(row?.earnings),
        orders: row?.orders || 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    res.json({
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      totalSales: round(agg.totalSales),
      totalEarnings: round(agg.totalEarnings),
      totalCommissionDeducted: round(agg.totalCommission),
      totalUnits: agg.totalUnits || 0,
      totalOrders: agg.orderIds?.length || 0,
      totalProducts: productCount,
      pendingOrders: orderStatus.find((row) => ["pending", "processing"].includes(row._id))?.orders || 0,
      lowStock,
      monthlySales: monthlySeries,
      topProducts: topProducts.map((row) => ({ title: row.title, units: row.units, sales: round(row.sales) })),
      orderStatus: orderStatus.map((row) => ({ status: row._id, orders: row.orders, value: round(row.value) })),
      storeName: vendor.storeName || "Vendor",
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

export const getPopularProducts = async (req, res) => {
  try {
    const products = await Product.find({ isPublished: true })
      .sort({ views: -1 })
      .limit(10)
      .populate("category", "name")
      .populate("vendor", "storeName")
      .select("title price images views stock category vendor")
      .lean();

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function buildAdminReportData(start, end) {
  const [summary, monthly, orderStatus, topProducts, totalUsers, totalProducts, totalVendors] = await Promise.all([
    Order.aggregate([
      { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalPlatformCommission: { $sum: "$platformCommission" }, totalSalesSubtotal: { $sum: "$subtotal" }, totalOrderValue: { $sum: "$totalAmount" }, paidOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } }, totalOrders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, sales: { $sum: "$subtotal" }, commission: { $sum: "$platformCommission" }, orders: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$status", orders: { $sum: 1 }, value: { $sum: "$totalAmount" } } },
      { $sort: { orders: -1 } },
    ]),
    Order.aggregate([
      { $match: { status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", title: { $first: "$items.title" }, units: { $sum: "$items.quantity" }, sales: { $sum: { $ifNull: ["$items.subtotal", { $multiply: ["$items.price", "$items.quantity"] }] } } } },
      { $sort: { sales: -1 } },
      { $limit: 10 },
    ]),
    User.countDocuments(),
    Product.countDocuments(),
    Vendor.countDocuments({ status: "approved" }),
  ]);

  const agg = summary[0] || {};
  return {
    summary: {
      totalPlatformCommission: round(agg.totalPlatformCommission),
      totalSalesSubtotal: round(agg.totalSalesSubtotal),
      totalOrderValue: round(agg.totalOrderValue),
      paidOrders: agg.paidOrders || 0,
      totalOrders: agg.totalOrders || 0,
      totalUsers,
      totalProducts,
      totalVendors,
    },
    monthly: monthly.map((row) => ({ label: monthLabel(new Date(row._id.year, row._id.month - 1, 1)), sales: round(row.sales), commission: round(row.commission), orders: row.orders })),
    orderStatus: orderStatus.map((row) => ({ status: row._id, orders: row.orders, value: round(row.value) })),
    topProducts: topProducts.map((row) => ({ title: row.title, units: row.units, sales: round(row.sales) })),
  };
}

async function buildVendorReportData(vendor, start, end) {
  const [summary, monthly, topProducts, orderStatus, totalProducts, lowStock] = await Promise.all([
    Order.aggregate([
      { $match: { "items.vendor": vendor._id, status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
      { $unwind: "$items" },
      { $match: { "items.vendor": vendor._id, "items.status": { $ne: "cancelled" } } },
      { $group: { _id: null, totalSales: { $sum: { $ifNull: ["$items.subtotal", { $multiply: ["$items.price", "$items.quantity"] }] } }, totalEarnings: { $sum: { $ifNull: ["$items.vendorEarnings", 0] } }, totalCommissionDeducted: { $sum: { $ifNull: ["$items.platformCommission", 0] } }, totalUnits: { $sum: "$items.quantity" }, orderIds: { $addToSet: "$_id" } } },
    ]),
    Order.aggregate([
      { $match: { "items.vendor": vendor._id, status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
      { $unwind: "$items" },
      { $match: { "items.vendor": vendor._id, "items.status": { $ne: "cancelled" } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, sales: { $sum: { $ifNull: ["$items.subtotal", { $multiply: ["$items.price", "$items.quantity"] }] } }, earnings: { $sum: { $ifNull: ["$items.vendorEarnings", 0] } }, orders: { $addToSet: "$_id" } } },
      { $project: { _id: 1, sales: 1, earnings: 1, orders: { $size: "$orders" } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Order.aggregate([
      { $match: { "items.vendor": vendor._id, status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } } },
      { $unwind: "$items" },
      { $match: { "items.vendor": vendor._id, "items.status": { $ne: "cancelled" } } },
      { $group: { _id: "$items.product", title: { $first: "$items.title" }, units: { $sum: "$items.quantity" }, sales: { $sum: { $ifNull: ["$items.subtotal", { $multiply: ["$items.price", "$items.quantity"] }] } } } },
      { $sort: { sales: -1 } },
      { $limit: 10 },
    ]),
    Order.aggregate([
      { $match: { "items.vendor": vendor._id, createdAt: { $gte: start, $lte: end } } },
      { $unwind: "$items" },
      { $match: { "items.vendor": vendor._id } },
      { $group: { _id: "$status", orders: { $addToSet: "$_id" }, value: { $sum: { $ifNull: ["$items.subtotal", 0] } } } },
      { $project: { _id: 1, orders: { $size: "$orders" }, value: 1 } },
      { $sort: { orders: -1 } },
    ]),
    Product.countDocuments({ vendor: vendor._id }),
    Product.countDocuments({ vendor: vendor._id, stock: { $lte: 5 } }),
  ]);

  const agg = summary[0] || {};
  return {
    storeName: vendor.storeName || "Vendor",
    summary: {
      totalSales: round(agg.totalSales),
      totalEarnings: round(agg.totalEarnings),
      totalCommissionDeducted: round(agg.totalCommissionDeducted),
      totalUnits: agg.totalUnits || 0,
      totalOrders: agg.orderIds?.length || 0,
      totalProducts,
      lowStock,
    },
    monthly: monthly.map((row) => ({ label: monthLabel(new Date(row._id.year, row._id.month - 1, 1)), sales: round(row.sales), earnings: round(row.earnings), orders: row.orders })),
    topProducts: topProducts.map((row) => ({ title: row.title, units: row.units, sales: round(row.sales) })),
    orderStatus: orderStatus.map((row) => ({ status: row._id, orders: row.orders, value: round(row.value) })),
  };
}

export const downloadAdminReport = async (req, res) => {
  try {
    const { start, end } = getPeriod(req);
    const data = await buildAdminReportData(start, end);
    const pdf = await buildAdminReport(data, { startDate: start, endDate: end });
    const filename = `admin-sales-report-${start.toISOString().slice(0, 10)}-to-${end.toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

export const downloadVendorReport = async (req, res) => {
  try {
    const { start, end } = getPeriod(req);
    const vendor = await Vendor.findOne({ user: req.user._id, status: "approved" }).lean();
    if (!vendor) return res.status(403).json({ message: "Vendor not approved" });

    const data = await buildVendorReportData(vendor, start, end);
    const pdf = await buildVendorReport(data, { startDate: start, endDate: end });
    const filename = `vendor-sales-report-${start.toISOString().slice(0, 10)}-to-${end.toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};
