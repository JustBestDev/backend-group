import createError from "http-errors";

import { findProfileByUserId } from "../services/profile.service.js";

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
