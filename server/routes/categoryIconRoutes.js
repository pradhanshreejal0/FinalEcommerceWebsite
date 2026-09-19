import express from "express";
import multer from "multer";

import {
  uploadCategoryIcon,
} from "../controllers/categoryIconController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

const storage =
  multer.memoryStorage();

const uploadSvg = multer({
  storage,

  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
      "image/svg+xml"
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only SVG files are allowed"
        ),
        false
      );
    }
  },

  limits: {
    fileSize: 500 * 1024,
  },
});

/*
 * ADMIN ONLY
 *
 * Vendor cannot use this.
 * Client cannot use this.
 */
router.post(
  "/",
  protect,
  authorize("admin"),
  uploadSvg.single("icon"),
  uploadCategoryIcon
);

export default router;
