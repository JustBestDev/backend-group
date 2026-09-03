import createError from "http-errors";

import { prisma } from "../lib/prisma.js";
import {
  assertOwnerApplicationDocumentLimit,
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
  documents: {
    select: { id: true, cloudinaryPublicId: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  user: {
    select: {
      profile: { select: { phone: true } },
    },
  },
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
    where: { userId },
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

export const resubmitCurrentUserOwnerApplicationDocuments = async (userId, files) => {
  const application = await prisma.ownerApplication.findFirst({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      status: true,
      documents: { select: { cloudinaryPublicId: true } },
    },
  });

  if (!application) throw createError(404, "Owner application not found");
  if (!["REJECTED", "NEED_MORE_DOCUMENTS"].includes(application.status)) {
    throw createError(409, "Documents can only be updated when action is required or the application was rejected");
  }
  if (application.status === "NEED_MORE_DOCUMENTS") {
    assertOwnerApplicationDocumentLimit(application.documents.length, files.length);
  }

  let uploadedDocuments = [];
  try {
    uploadedDocuments = await uploadOwnerDocumentsToCloudinary(files, userId);
    if (uploadedDocuments.some(({ publicId }) => !publicId)) {
      throw createError(502, "Document upload did not return a Cloudinary public ID");
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.ownerApplication.updateMany({
        where: {
          id: application.id,
          status: application.status,
        },
        data: {
          status: "PENDING",
          rejectReason: null,
          reviewedAt: null,
          reviewedById: null,
        },
      });
      if (claimed.count !== 1) {
        throw createError(409, "The application status changed before the documents could be updated");
      }

      const existingDocumentCount = await tx.ownerApplicationDocument.count({
        where: { ownerApplicationId: application.id },
      });
      if (application.status === "NEED_MORE_DOCUMENTS") {
        assertOwnerApplicationDocumentLimit(existingDocumentCount, uploadedDocuments.length);
      }

      if (application.status === "REJECTED") {
        await tx.ownerApplicationDocument.deleteMany({
          where: { ownerApplicationId: application.id },
        });
      }

      await tx.ownerApplicationDocument.createMany({
        data: uploadedDocuments.map(({ documentUrl, publicId }) => ({
          ownerApplicationId: application.id,
          documentUrl,
          cloudinaryPublicId: publicId,
        })),
      });
    });
  } catch (error) {
    if (uploadedDocuments.length) {
      await deletePrivateOwnerDocuments(uploadedDocuments.map(({ publicId }) => publicId));
    }
    throw error;
  }

  if (application.status === "REJECTED") {
    await deletePrivateOwnerDocuments(
      application.documents.map(({ cloudinaryPublicId }) => cloudinaryPublicId)
    );
  }
  return findCurrentUserOwnerApplication(userId);
};
