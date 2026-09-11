import createError from "http-errors";
import {
  emitConversationMessagesRead,
  emitNewConversationMessage,
} from "../socket.js";

import {
  findPropertyById,
  findConversationUserById,
  findExistingConversation,
  createConversation,
  findConversationsByUserId,
  findConversationByIdAndUserId,
  findConversationMember,
  findMessagesByConversationId,
  countConversationMessages,
  createConversationMessage,
  markMessagesAsRead,
  findActiveAdmin,
  findExistingSupportConversation,
  createSupportConversation,
  countUnreadMessagesByUserId,
  findShareablePropertyById,
  findShareableRoomById,
} from "../services/conversation.service.js";

const MESSAGE_TYPES = new Set(["TEXT", "PROPERTY_SHARE", "ROOM_SHARE"]);

export const validateMessagePayload = ({ message, type = "TEXT", propertyId, roomId }) => {
  if (!MESSAGE_TYPES.has(type)) throw createError(400, "Invalid message type");
  if (message !== undefined && message !== null && typeof message !== "string") {
    throw createError(400, "Message must be a string");
  }
  const content = message?.trim() || "";
  if (type === "TEXT" && !content) throw createError(400, "Message is required");
  if (content.length > 5000) throw createError(400, "Message must not exceed 5000 characters");

  const requiredId = type === "PROPERTY_SHARE" ? propertyId : type === "ROOM_SHARE" ? roomId : null;
  if (type !== "TEXT" && (!Number.isInteger(Number(requiredId)) || Number(requiredId) < 1)) {
    throw createError(400, `Invalid ${type === "PROPERTY_SHARE" ? "property" : "room"} ID`);
  }

  return {
    message: content || null,
    type,
    propertyId: type === "PROPERTY_SHARE" ? Number(propertyId) : null,
    roomId: type === "ROOM_SHARE" ? Number(roomId) : null,
  };
};

export const requireConversationMembership = (membership) => {
  if (!membership) throw createError(403, "You are not a member of this conversation");
};

export const requireShareableListing = async (
  payload,
  findProperty = findShareablePropertyById,
  findRoom = findShareableRoomById,
) => {
  if (payload.type === "PROPERTY_SHARE" && !(await findProperty(payload.propertyId))) {
    throw createError(404, "Property not found or unavailable");
  }
  if (payload.type === "ROOM_SHARE" && !(await findRoom(payload.roomId))) {
    throw createError(404, "Room not found or unavailable");
  }
};

export const createAdminSupportConversation = async (req, res, next) => {
  try {
    const admin = await findActiveAdmin();
    if (!admin) return next(createError(503, "No active administrator is available"));
    const existing = await findExistingSupportConversation(req.user.id, admin.id);
    if (existing) return res.status(200).json({ message: "Support conversation already exists", conversation: existing });
    const conversation = await createSupportConversation(req.user.id, admin.id);
    return res.status(201).json({ message: "Support conversation created successfully", conversation });
  } catch (error) {
    next(error);
  }
};

// ==============================
// CREATE CONVERSATION
// POST /api/conversations
// ==============================

export const createNewConversation = async (
  req,
  res,
  next
) => {
  try {
    const currentUserId = req.user.id;

    const { propertyId, memberId } = req.body;

    if (!propertyId || !memberId) {
      return next(
        createError(
          400,
          "propertyId and memberId are required"
        )
      );
    }

    const parsedPropertyId = Number(propertyId);
    const parsedMemberId = Number(memberId);

    if (
      !Number.isInteger(parsedPropertyId) ||
      parsedPropertyId < 1
    ) {
      return next(
        createError(400, "Invalid property ID")
      );
    }

    if (
      !Number.isInteger(parsedMemberId) ||
      parsedMemberId < 1
    ) {
      return next(
        createError(400, "Invalid member ID")
      );
    }

    if (currentUserId === parsedMemberId) {
      return next(
        createError(
          400,
          "You cannot start a conversation with yourself"
        )
      );
    }

    const property = await findPropertyById(
      parsedPropertyId
    );

    if (!property) {
      return next(
        createError(404, "Property not found")
      );
    }

    /*
      Conversation ของ Property ต้องมีเจ้าของ
      Property เป็นสมาชิกฝ่ายใดฝ่ายหนึ่ง
    */
    const isCurrentUserOwner =
      property.ownerId === currentUserId;

    const isTargetUserOwner =
      property.ownerId === parsedMemberId;

    if (!isCurrentUserOwner && !isTargetUserOwner) {
      return next(
        createError(
          400,
          "A property conversation must include the property owner"
        )
      );
    }

    /*
      ผู้ใช้ทั่วไปควรติดต่อได้เฉพาะ Property
      ที่ผ่านการอนุมัติแล้ว
    */
    if (
      !isCurrentUserOwner &&
      property.publishStatus !== "APPROVED"
    ) {
      return next(
        createError(
          403,
          "This property is not available for conversation"
        )
      );
    }

    const targetUser =
      await findConversationUserById(
        parsedMemberId
      );

    if (!targetUser) {
      return next(
        createError(404, "User not found")
      );
    }

    if (targetUser.status !== "ACTIVE") {
      return next(
        createError(
          403,
          "This user is not available"
        )
      );
    }

    const existingConversation =
      await findExistingConversation(
        parsedPropertyId,
        currentUserId,
        parsedMemberId
      );

    if (existingConversation) {
      return res.status(200).json({
        message: "Conversation already exists",
        conversation: existingConversation,
      });
    }

    const conversation =
      await createConversation(
        parsedPropertyId,
        currentUserId,
        parsedMemberId
      );

    return res.status(201).json({
      message: "Conversation created successfully",
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// ==============================
// GET MY CONVERSATIONS
// GET /api/conversations
// ==============================

export const getMyConversations = async (
  req,
  res,
  next
) => {
  try {
    const currentUserId = req.user.id;

    const conversations =
      await findConversationsByUserId(
        currentUserId
      );

    return res.status(200).json({
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadMessageCount = async (req, res, next) => {
  try {
    const count = await countUnreadMessagesByUserId(req.user.id);
    return res.status(200).json({ data: { count } });
  } catch (error) {
    next(error);
  }
};

// ==============================
// GET CONVERSATION BY ID
// GET /api/conversations/:conversationId
// ==============================

export const getConversationById = async (
  req,
  res,
  next
) => {
  try {
    const currentUserId = req.user.id;

    const conversationId = Number(
      req.params.conversationId
    );

    if (
      !Number.isInteger(conversationId) ||
      conversationId < 1
    ) {
      return next(
        createError(
          400,
          "Invalid conversation ID"
        )
      );
    }

    const conversation =
      await findConversationByIdAndUserId(
        conversationId,
        currentUserId
      );

    if (!conversation) {
      return next(
        createError(
          404,
          "Conversation not found or access denied"
        )
      );
    }

    return res.status(200).json({
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// ==============================
// GET MESSAGES
// GET /api/conversations/:conversationId/messages
// ==============================

export const getConversationMessages = async (
  req,
  res,
  next
) => {
  try {
    const currentUserId = req.user.id;

    const conversationId = Number(
      req.params.conversationId
    );

    if (
      !Number.isInteger(conversationId) ||
      conversationId < 1
    ) {
      return next(
        createError(
          400,
          "Invalid conversation ID"
        )
      );
    }

    let page = Number(req.query.page) || 1;
    let limit = Number(req.query.limit) || 20;

    page = Math.max(page, 1);
    limit = Math.min(Math.max(limit, 1), 100);

    const membership =
      await findConversationMember(
        conversationId,
        currentUserId
      );

    requireConversationMembership(membership);

    const [messages, total] =
      await Promise.all([
        findMessagesByConversationId(
          conversationId,
          page,
          limit
        ),

        countConversationMessages(
          conversationId
        ),
      ]);

    return res.status(200).json({
      messages,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==============================
// SEND MESSAGE
// POST /api/conversations/:conversationId/messages
// ==============================


export const sendConversationMessage = async (
  req,
  res,
  next
) => {
  try {
    const currentUserId = req.user.id;

    const conversationId = Number(
      req.params.conversationId
    );

    if (
      !Number.isInteger(conversationId) ||
      conversationId < 1
    ) {
      return next(
        createError(
          400,
          "Invalid conversation ID"
        )
      );
    }

    const payload = validateMessagePayload(req.body);

    const membership =
      await findConversationMember(
        conversationId,
        currentUserId
      );

    requireConversationMembership(membership);

    await requireShareableListing(payload);

    const newMessage =
      await createConversationMessage(
        conversationId,
        currentUserId,
        payload
      );

    await emitNewConversationMessage(
      req.app.get("io"),
      conversationId,
      newMessage
    );

    return res.status(201).json({
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    next(error);
  }
};

// ==============================
// MARK MESSAGE AS READ
// PATCH /api/conversations/:conversationId/read
// ==============================

export const readConversationMessages = async (
  req,
  res,
  next
) => {
  try {
    const currentUserId = req.user.id;

    const conversationId = Number(
      req.params.conversationId
    );

    if (
      !Number.isInteger(conversationId) ||
      conversationId < 1
    ) {
      return next(
        createError(
          400,
          "Invalid conversation ID"
        )
      );
    }

    const membership =
      await findConversationMember(
        conversationId,
        currentUserId
      );

    if (!membership) {
      return next(
        createError(
          403,
          "You are not a member of this conversation"
        )
      );
    }

    const result = await markMessagesAsRead(
      conversationId,
      currentUserId
    );

    if (result.count > 0) {
      await emitConversationMessagesRead(
        req.app.get("io"),
        conversationId,
        currentUserId
      );
    }

    return res.status(200).json({
      message: "Messages marked as read",
      updatedCount: result.count,
    });
  } catch (error) {
    next(error);
  }
};
