import createError from "http-errors";

import {
  createOwnerApplication,
  findCurrentUserOwnerApplication,
} from "../services/ownerApplication.service.js";

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
      data: application,
    });
  } catch (error) {
    next(error);
  }
};
