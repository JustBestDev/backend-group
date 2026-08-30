import createError from "http-errors";

import {
  findProfileByUserId,
  findPublicProfileByUserId,
  updateProfileByUserId,
} from "../services/profile.service.js";
import { updateProfileSchema } from "../validations/schema.js";

export const getMyProfile = async (req, res, next) => {
  try {
    const profile = await findProfileByUserId(req.user.id);

    if (!profile) {
      return next(createError(404, "Profile not found"));
    }

    return res.status(200).json({
      profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfileByUserId = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return next(createError(400, "Invalid userId"));
    }

    const profile = await findPublicProfileByUserId(userId);

    if (!profile) {
      return next(createError(404, "Profile not found"));
    }

    return res.status(200).json({
      profile,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    console.log('req.user.id', req.user.id)
    console.log('req.body', req.body)
    const profileData = updateProfileSchema.parse(req.body);
    const profile = await updateProfileByUserId(req.user.id, profileData);

    if (!profile) {
      return next(createError(404, "Profile not found"));
    }

    return res.status(200).json({
      profile,
    });
  } catch (error) {
    next(error);
  }
};
