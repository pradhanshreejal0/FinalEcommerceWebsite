import express from "express";
import {
  register,
  login,
  logout,
  refresh,
  getMe,
  updateMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);

router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

export default router;