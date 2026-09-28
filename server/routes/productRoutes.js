import express from "express";
import {
  createProduct,
  getMyProducts,
  getProducts,
  getSearchSuggestions,
  getProductById,
  updateProduct,
  deleteProduct,
  generateProductDescription,
} from "../controllers/productController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.get("/", getProducts);
router.get("/vendor/my-products", protect, authorize("vendor"), getMyProducts);
router.get("/suggest", getSearchSuggestions); // must come before "/:id"
router.get("/:id", getProductById);

// Vendor only
router.post("/", protect, authorize("vendor"), createProduct);
router.post(
  "/generate-description",
  protect,
  authorize("vendor"),
  generateProductDescription
);
router.put("/:id", protect, authorize("vendor"), updateProduct);
router.delete("/:id", protect, authorize("vendor"), deleteProduct);

export default router;
