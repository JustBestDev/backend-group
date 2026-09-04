import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { prisma } from "./lib/prisma.js";

export const SOCKET_EVENTS = {
  JOIN_CONVERSATION: "conversation:join",
  LEAVE_CONVERSATION: "conversation:leave",
  NEW_MESSAGE: "message:new",
  MESSAGES_READ: "message:read",
};

const conversationRoom = (conversationId) =>
  `conversation:${conversationId}`;
const userRoom = (userId) => `user:${userId}`;

const getAllowedOrigins = () =>
  (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const getHandshakeToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const authorization = socket.handshake.headers.authorization;
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = getHandshakeToken(socket);
    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET_USER, {
      algorithms: ["HS256"],
    });
    const userId = Number(decoded?.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return next(new Error("Unauthorized"));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return next(new Error("Unauthorized"));
    }

    socket.data.user = user;
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
};

const parseConversationId = (payload) => {
  const conversationId = Number(
    typeof payload === "object" ? payload?.conversationId : payload,
  );
  return Number.isInteger(conversationId) && conversationId > 0
    ? conversationId
    : null;
};

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId = socket.data.user.id;
    socket.join(userRoom(userId));

    socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async (payload, reply) => {
      try {
        const conversationId = parseConversationId(payload);
        if (!conversationId) {
          reply?.({ ok: false, message: "Invalid conversation ID" });
          return;
        }

        const membership = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: { conversationId, userId },
          },
          select: { conversationId: true },
        });
        if (!membership) {
          reply?.({ ok: false, message: "Forbidden" });
          return;
        }

        await socket.join(conversationRoom(conversationId));

        const readResult = await prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: userId },
            isRead: false,
          },
          data: { isRead: true },
        });

        if (readResult.count > 0) {
          await emitConversationMessagesRead(io, conversationId, userId);
        }

        reply?.({ ok: true });
      } catch {
        reply?.({ ok: false, message: "Unable to join conversation" });
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (payload) => {
      const conversationId = parseConversationId(payload);
      if (conversationId) socket.leave(conversationRoom(conversationId));
    });
  });

  return io;
};

export const emitNewConversationMessage = async (
  io,
  conversationId,
  message,
) => {
  if (!io) return;

  try {
    const members = await prisma.conversationMember.findMany({
      where: { conversationId: Number(conversationId) },
      select: { userId: true },
    });
    const rooms = members.map(({ userId }) => userRoom(userId));
    if (rooms.length === 0) return;

    io.to(rooms).emit(SOCKET_EVENTS.NEW_MESSAGE, {
      conversationId: Number(conversationId),
      message,
    });
  } catch (error) {
    console.error("Unable to emit real-time message:", error);
  }
};

export const emitConversationMessagesRead = async (
  io,
  conversationId,
  readerId,
) => {
  if (!io) return;

  try {
    const members = await prisma.conversationMember.findMany({
      where: { conversationId: Number(conversationId) },
      select: { userId: true },
    });
    const rooms = members.map(({ userId }) => userRoom(userId));
    if (rooms.length === 0) return;

    io.to(rooms).emit(SOCKET_EVENTS.MESSAGES_READ, {
      conversationId: Number(conversationId),
      readerId: Number(readerId),
    });
  } catch (error) {
    console.error("Unable to emit message read receipt:", error);
  }
};
