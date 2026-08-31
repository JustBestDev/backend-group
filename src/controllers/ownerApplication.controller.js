import createError from "http-errors";

import {
  createOwnerApplication,
  findCurrentUserOwnerApplication,
} from "../services/ownerApplication.service.js";
import { ownerApplicationSchema } from "../validations/schema.js";

export const submitOwnerApplication = async (req, res, next) => {
  try {
    const applicationData = ownerApplicationSchema.parse(req.body);
    const application = await createOwnerApplication(
      req.user.id,
      applicationData
    );

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
