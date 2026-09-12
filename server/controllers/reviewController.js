import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

const recalculateProductRatings = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const average = stats[0]?.average || 0;
  const count = stats[0]?.count || 0;

  await Product.findByIdAndUpdate(productId, {
    ratings: {
      average: Math.round(average * 10) / 10,
      count,
    },
  });
};

// Public: Get all reviews for a product
export const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error("Get reviews error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    res.status(500).json({ message: error.message || "Failed to load reviews" });
  }
};

// Customer: Check if current user can review a product
// (has a delivered order item for it and hasn't reviewed yet)
export const getReviewEligibility = async (req, res) => {
  try {
    const { productId } = req.params;

    const existing = await Review.findOne({
      product: productId,
      user: req.user._id,
    });

    if (existing) {
      return res.json({ canReview: false, reason: "already_reviewed", review: existing });
    }

    const deliveredOrder = await Order.findOne({
      user: req.user._id,
      items: {
        $elemMatch: { product: productId, status: "delivered" },
      },
    }).sort({ createdAt: -1 });

    if (!deliveredOrder) {
      return res.json({ canReview: false, reason: "not_purchased" });
    }

    res.json({ canReview: true, orderId: deliveredOrder._id });
  } catch (error) {
    console.error("Review eligibility error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    res.status(500).json({ message: error.message || "Failed to check eligibility" });
  }
};

// Customer: Create a review (verified purchase only)
export const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existing = await Review.findOne({ product: productId, user: req.user._id });
    if (existing) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    const deliveredOrder = await Order.findOne({
      user: req.user._id,
      items: {
        $elemMatch: { product: productId, status: "delivered" },
      },
    }).sort({ createdAt: -1 });

    if (!deliveredOrder) {
      return res.status(403).json({
        message: "You can only review products from delivered orders",
      });
    }

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      order: deliveredOrder._id,
      rating: numericRating,
      comment: comment ? String(comment).trim() : "",
    });

    await recalculateProductRatings(productId);

    const populated = await Review.findById(review._id).populate("user", "name");

    res.status(201).json(populated);
  } catch (error) {
    console.error("Create review error:", error);

    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    res.status(500).json({ message: error.message || "Failed to create review" });
  }
};

// Customer: Update own review
export const updateReview = async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, user: req.user._id });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const { rating, comment } = req.body;

    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
      }
      review.rating = numericRating;
    }

    if (comment !== undefined) {
      review.comment = String(comment).trim();
    }

    await review.save();
    await recalculateProductRatings(review.product);

    const populated = await Review.findById(review._id).populate("user", "name");

    res.json(populated);
  } catch (error) {
    console.error("Update review error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid review ID" });
    }

    res.status(500).json({ message: error.message || "Failed to update review" });
  }
};

// Customer (own) or Admin: Delete a review
export const deleteReview = async (req, res) => {
  try {
    const filter =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, user: req.user._id };

    const review = await Review.findOneAndDelete(filter);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await recalculateProductRatings(review.product);

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Delete review error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid review ID" });
    }

    res.status(500).json({ message: error.message || "Failed to delete review" });
  }
};