import express from "express";
import {
  createReturnRequest,
  getMyReturns,
  getVendorReturns,
  getAllReturns,
  updateReturnStatus,
} from "../controllers/returnController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("customer"), createReturnRequest);
router.get("/my", protect, authorize("customer"), getMyReturns);
router.get("/vendor", protect, authorize("vendor"), getVendorReturns);
router.get("/admin", protect, authorize("admin"), getAllReturns);
router.put("/:id/status", protect, authorize("admin"), updateReturnStatus);

export default router;
