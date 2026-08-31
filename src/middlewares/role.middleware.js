import { prisma } from "../lib/prisma.js";

export const allowRoles = (...roles) => {

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(req.user.id) },
        select: { id: true, role: true, status: true },
      });

      if (!user || user.status !== "ACTIVE") {
        return res.status(403).json({ message: "User account is not active" });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      req.user = { ...req.user, ...user };
      next();
    } catch (error) {
      next(error);
    }
  };
};
