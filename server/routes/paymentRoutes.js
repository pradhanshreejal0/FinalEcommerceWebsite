import express from "express";
import {
  initiatePayment,
  payOrder,
  verifyPayment,
} from "../controllers/paymentController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Customer starts online payment for an existing order
router.post(
  "/initiate",
  protect,
  authorize("customer"),
  initiatePayment
);

export default router;

// Also mounted from order routes as aliases:
// POST /api/orders/:id/pay
// POST /api/orders/:id/verify-payment
export { payOrder, verifyPayment };
