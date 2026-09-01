import createError from "http-errors";

import { prisma } from "../lib/prisma.js";
import {
  deletePrivateOwnerDocuments,
  uploadOwnerDocumentsToCloudinary,
} from "../utils/uploadCloudOwnerApplication.js";

const submittedApplicationSelect = {
  id: true,
  status: true,
  createdAt: true,
  documents: {
    select: { id: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
};

const ownerApplicationSelect = {
  ...submittedApplicationSelect,
  rejectReason: true,
  reviewedAt: true,
};

const assertCanApply = async (client, userId) => {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw createError(404, "User not found");
  }

  if (user.role === "OWNER") {
    throw createError(409, "User is already an owner");
  }

  const existingApplication = await client.ownerApplication.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "APPROVED"] },
    },
    select: { id: true },
  });

  if (existingApplication) {
    throw createError(409, "Owner application already exists");
  }
};

export const createOwnerApplication = async (userId, files) => {
  await assertCanApply(prisma, userId);

  let uploadedDocuments = [];
  try {
    uploadedDocuments = await uploadOwnerDocumentsToCloudinary(files, userId);
    if (uploadedDocuments.some(({ publicId }) => !publicId)) {
      throw createError(502, "Document upload did not return a Cloudinary public ID");
    }

    return await prisma.$transaction(async (tx) => {
      await assertCanApply(tx, userId);
      return tx.ownerApplication.create({
        data: {
          userId,
          documents: {
            create: uploadedDocuments.map(({ documentUrl, publicId }) => ({
              documentUrl,
              cloudinaryPublicId: publicId,
            })),
          },
        },
        select: submittedApplicationSelect,
      });
    });
  } catch (error) {
    if (uploadedDocuments.length) {
      await deletePrivateOwnerDocuments(
        uploadedDocuments.map(({ publicId }) => publicId)
      );
    }
    throw error;
  }
};

export const findCurrentUserOwnerApplication = async (userId) => {
  return prisma.ownerApplication.findFirst({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: ownerApplicationSelect,
  });
};
