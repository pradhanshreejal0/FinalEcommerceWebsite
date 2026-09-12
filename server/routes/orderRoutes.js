import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getVendorOrders,
  updateOrderStatus,
  getAllOrders,
} from "../controllers/orderController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Specific paths BEFORE /:id
router.post("/", protect, authorize("customer"), createOrder);
router.get("/my-orders", protect, authorize("customer"), getMyOrders);
router.get("/vendor", protect, authorize("vendor"), getVendorOrders);
router.get("/admin/all", protect, authorize("admin"), getAllOrders);

router.get("/:id", protect, getOrderById);
router.put("/:id/status", protect, authorize("vendor"), updateOrderStatus);

export default router;