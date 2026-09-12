import express from "express";
import {
  createAd,
  getAds,
  getAdById,
  updateAd,
  deleteAd,
} from "../controllers/adController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public – only active ads
router.get("/", getAds);

// Admin only
router.post("/", protect, authorize("admin"), createAd);
router.get("/:id", protect, authorize("admin"), getAdById);
router.put("/:id", protect, authorize("admin"), updateAd);
router.delete("/:id", protect, authorize("admin"), deleteAd);

export default router;