import express from "express";

import {
  createOrder,
  getDeliveryQuote,
  getMyOrders,
  getOrderById,
  getVendorOrders,
  updateOrderStatus,
  getAllOrders,
} from "../controllers/orderController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

// =====================================================
// Customer
// =====================================================

// Delivery quote MUST come before /:id
router.post(
  "/delivery-quote",
  protect,
  authorize("customer"),
  getDeliveryQuote
);

router.post(
  "/",
  protect,
  authorize("customer"),
  createOrder
);

router.get(
  "/my-orders",
  protect,
  authorize("customer"),
  getMyOrders
);

// =====================================================
// Vendor
// =====================================================

router.get(
  "/vendor",
  protect,
  authorize("vendor"),
  getVendorOrders
);

router.put(
  "/:id/status",
  protect,
  authorize("vendor"),
  updateOrderStatus
);

// =====================================================
// Admin
// =====================================================

router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  getAllOrders
);

// =====================================================
// Single Order
// =====================================================

router.get(
  "/:id",
  protect,
  getOrderById
);

export default router;
