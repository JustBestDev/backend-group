import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_USER, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return null;
    }

    throw error;
  }
};

const loadCurrentUser = async (decoded) => {
  const userId = Number(decoded?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });
};

const setAuthenticatedUser = async (token, req, res, next) => {
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await loadCurrentUser(decoded);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "User account is not active" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const token = authHeader.slice("Bearer ".length);
  return setAuthenticatedUser(token, req, res, next);
};

export const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice("Bearer ".length);
  return setAuthenticatedUser(token, req, res, next);
};
