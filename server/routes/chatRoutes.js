import express from "express";
import {
  startChat,
  sendMessage,
  getMyChats,
  getChatById,
} from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect); // all chat routes need login

router.post("/start", startChat);
router.get("/", getMyChats);
router.get("/:id", getChatById);
router.post("/:id/message", sendMessage);

export default router;