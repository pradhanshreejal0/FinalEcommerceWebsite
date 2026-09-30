import express from "express";
import {
  getMyPayoutSummary,
  getAdminPayoutOverview,
  createPayout,
  updatePayoutStatus,
} from "../controllers/payoutController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", protect, authorize("vendor"), getMyPayoutSummary);
router.get("/admin", protect, authorize("admin"), getAdminPayoutOverview);
router.post("/", protect, authorize("admin"), createPayout);
router.put("/:id/status", protect, authorize("admin"), updatePayoutStatus);

export default router;
