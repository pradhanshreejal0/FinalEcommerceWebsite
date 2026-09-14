import express from "express";
import {
  getPendingVendors,
  getAllVendors,
  approveVendor,
  rejectVendor,
  getMyVendorProfile,
  updateMyVendorProfile,
    createVendor,
  } from "../controllers/vendorController.js";
  import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/pending", protect, authorize("admin"), getPendingVendors);
router.get("/", protect, authorize("admin"), getAllVendors);

router.put("/:id/approve", protect, authorize("admin"), approveVendor);
router.put("/:id/reject", protect, authorize("admin"), rejectVendor);

// Admin creates vendor
router.post("/", protect, authorize("admin"), createVendor);

router.get("/me", protect, authorize("vendor"), getMyVendorProfile);
router.put("/me", protect, authorize("vendor"), updateMyVendorProfile);

export default router;
