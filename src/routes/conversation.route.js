import express from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

import {
  createNewConversation,
  getMyConversations,
  getConversationById,
  getConversationMessages,
  sendConversationMessage,
  readConversationMessages,
  createAdminSupportConversation,
} from "../controllers/conversation.controller.js";

const router = express.Router();

// Conversation Route ต้อง Login
router.use(authenticate);

// GET /api/conversations
router.get(
  "/",
  getMyConversations
);

// POST /api/conversations
router.post(
  "/",
  createNewConversation
);

router.post("/support", allowRoles("OWNER"), createAdminSupportConversation);

// GET /api/conversations/:conversationId/messages
router.get(
  "/:conversationId/messages",
  getConversationMessages
);

// POST /api/conversations/:conversationId/messages
router.post(
  "/:conversationId/messages",
  sendConversationMessage
);

// PATCH /api/conversations/:conversationId/read
router.patch(
  "/:conversationId/read",
  readConversationMessages
);

// GET /api/conversations/:conversationId
router.get(
  "/:conversationId",
  getConversationById
);

export default router;
