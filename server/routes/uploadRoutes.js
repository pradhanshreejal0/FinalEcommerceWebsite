import express from "express";
import { uploadImage } from "../controllers/uploadController.js";
import { upload } from "../middleware/uploadMiddleware.js";
import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("admin", "vendor"),
  upload.single("image"),
  uploadImage
);

export default router;