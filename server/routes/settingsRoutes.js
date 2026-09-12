import express from "express";
import {
  getPublicSettings,
  getSettings,
  updateSettings,
} from "../controllers/settingsController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/public", getPublicSettings);

router.get("/", protect, authorize("admin"), getSettings);
router.put("/", protect, authorize("admin"), updateSettings);

export default router;