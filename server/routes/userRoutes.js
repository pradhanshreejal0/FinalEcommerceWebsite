import express from "express";
import {
  getAllUsers,
  getUserById,
  banUser,
  unbanUser,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id/ban", banUser);
router.put("/:id/unban", unbanUser);

export default router;