import createError from "http-errors";

import {
  createOwnerApplication,
  findCurrentUserOwnerApplication,
  resubmitCurrentUserOwnerApplicationDocuments,
} from "../services/ownerApplication.service.js";
import { createOwnerDocumentSignedUrl } from "../utils/uploadCloudOwnerApplication.js";

const presentOwnerApplication = (application) => ({
  ...application,
  phone: application.user?.profile?.phone ?? null,
  user: undefined,
  documents: application.documents.map((document) => ({
    id: document.id,
    createdAt: document.createdAt,
    signedUrl: document.cloudinaryPublicId
      ? createOwnerDocumentSignedUrl(document.cloudinaryPublicId)
      : null,
  })),
});

export const submitOwnerApplication = async (req, res, next) => {
  try {
    const application = await createOwnerApplication(req.user.id, req.files);

    return res.status(201).json({
      message: "Owner application submitted successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOwnerApplication = async (req, res, next) => {
  try {
    const application = await findCurrentUserOwnerApplication(req.user.id);

    if (!application) {
      return next(createError(404, "Owner application not found"));
    }

    return res.status(200).json({
      message: "Owner application retrieved successfully",
      data: presentOwnerApplication(application),
    });
  } catch (error) {
    next(error);
  }
};

export const resubmitMyOwnerApplication = async (req, res, next) => {
  try {
    const application = await resubmitCurrentUserOwnerApplicationDocuments(
      req.user.id,
      req.files
    );
    return res.status(200).json({
      message: "Owner application resubmitted successfully",
      data: presentOwnerApplication(application),
    });
  } catch (error) {
    next(error);
  }
};
