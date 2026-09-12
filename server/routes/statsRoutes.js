import express from "express";
import {
  getAdminStats,
  getVendorStats,
  getPopularProducts,
} from "../controllers/statsController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/admin", protect, authorize("admin"), getAdminStats);
router.get("/vendor", protect, authorize("vendor"), getVendorStats);
router.get("/popular", protect, authorize("admin"), getPopularProducts);

export default router;