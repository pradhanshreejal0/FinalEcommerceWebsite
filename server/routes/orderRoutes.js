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
  payOrder,
  verifyPayment,
} from "../controllers/paymentController.js";

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

// Online payment (aliases used by the client)
router.post(
  "/:id/pay",
  protect,
  authorize("customer"),
  payOrder
);

router.post(
  "/:id/verify-payment",
  protect,
  authorize("customer"),
  verifyPayment
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
