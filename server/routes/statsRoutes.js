import express from "express";
import {
  getAdminStats,
  getVendorStats,
  getPopularProducts,
  downloadAdminReport,
  downloadVendorReport,
} from "../controllers/statsController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/admin", protect, authorize("admin"), getAdminStats);
router.get("/admin/report.pdf", protect, authorize("admin"), downloadAdminReport);
router.get("/vendor", protect, authorize("vendor"), getVendorStats);
router.get("/vendor/report.pdf", protect, authorize("vendor"), downloadVendorReport);
router.get("/popular", protect, authorize("admin"), getPopularProducts);

export default router;
