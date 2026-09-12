import express from "express";
import {
  createProduct,
  getMyProducts,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.get("/", getProducts);
router.get("/vendor/my-products", protect, authorize("vendor"), getMyProducts);
router.get("/:id", getProductById);

// Vendor only
router.post("/", protect, authorize("vendor"), createProduct);
router.put("/:id", protect, authorize("vendor"), updateProduct);
router.delete("/:id", protect, authorize("vendor"), deleteProduct);

export default router;