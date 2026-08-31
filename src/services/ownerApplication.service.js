import createError from "http-errors";

import { prisma } from "../lib/prisma.js";

const submittedApplicationSelect = {
  id: true,
  status: true,
  documentUrl: true,
  createdAt: true,
};

const ownerApplicationSelect = {
  ...submittedApplicationSelect,
  rejectReason: true,
  reviewedAt: true,
};

export const createOwnerApplication = async (userId, applicationData) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw createError(404, "User not found");
  }

  if (user.role === "OWNER") {
    throw createError(409, "User is already an owner");
  }

  const existingApplication = await prisma.ownerApplication.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "APPROVED"] },
    },
    select: { id: true },
  });

  if (existingApplication) {
    throw createError(409, "Owner application already exists");
  }

  return prisma.ownerApplication.create({
    data: {
      userId,
      documentUrl: applicationData.documentUrl,
    },
    select: submittedApplicationSelect,
  });
};

export const findCurrentUserOwnerApplication = async (userId) => {
  return prisma.ownerApplication.findFirst({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: ownerApplicationSelect,
  });
};
