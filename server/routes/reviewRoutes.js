import express from "express";
import {
  getProductReviews,
  getReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
} from "../controllers/reviewController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.get("/product/:productId", getProductReviews);

// Customer
router.get(
  "/eligibility/:productId",
  protect,
  authorize("customer"),
  getReviewEligibility
);
router.post("/", protect, authorize("customer"), createReview);
router.put("/:id", protect, authorize("customer"), updateReview);

// Customer (own) or Admin
router.delete("/:id", protect, authorize("customer", "admin"), deleteReview);

export default router;