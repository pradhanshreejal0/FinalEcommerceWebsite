import express from "express";
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} from "../controllers/couponController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/validate", protect, authorize("customer"), validateCoupon);

router.get("/", protect, authorize("admin"), listCoupons);
router.post("/", protect, authorize("admin"), createCoupon);
router.put("/:id", protect, authorize("admin"), updateCoupon);
router.delete("/:id", protect, authorize("admin"), deleteCoupon);

export default router;
