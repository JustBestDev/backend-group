import createError from "http-errors";

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
} from "../services/conversation.service.js";

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

    if (!membership) {
      return next(
        createError(
          403,
          "You are not a member of this conversation"
        )
      );
    }

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

    const { message } = req.body;

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

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return next(
        createError(
          400,
          "Message is required"
        )
      );
    }

    if (message.trim().length > 5000) {
      return next(
        createError(
          400,
          "Message must not exceed 5000 characters"
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

    const newMessage =
      await createConversationMessage(
        conversationId,
        currentUserId,
        message
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

    return res.status(200).json({
      message: "Messages marked as read",
      updatedCount: result.count,
    });
  } catch (error) {
    next(error);
  }
};