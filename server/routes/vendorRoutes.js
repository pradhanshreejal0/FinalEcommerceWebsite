import express from "express";
import {
  getPendingVendors,
  getAllVendors,
  approveVendor,
  rejectVendor,
  getMyVendorProfile,
  updateMyVendorProfile,
  createVendor,
  updateVendorLocation,
  getPublicStore,
} from "../controllers/vendorController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public store
router.get("/store/:slug", getPublicStore);

// Vendor self-service (before /:id routes)
router.get("/me", protect, authorize("vendor"), getMyVendorProfile);
router.put("/me", protect, authorize("vendor"), updateMyVendorProfile);

// Admin
router.get("/pending", protect, authorize("admin"), getPendingVendors);
router.get("/", protect, authorize("admin"), getAllVendors);
router.post("/", protect, authorize("admin"), createVendor);
router.put("/:id/approve", protect, authorize("admin"), approveVendor);
router.put("/:id/reject", protect, authorize("admin"), rejectVendor);
router.put("/:id/location", protect, authorize("admin"), updateVendorLocation);

export default router;
