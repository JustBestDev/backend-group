import express from "express";

import {
  getMyProfile,
  getProfileByUserId,
  updateMyProfile,
} from "../controllers/profile.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  uploadProfileImage,
  validateProfileImageType,
} from "../utils/uploadCloudProfile.js";

const profileRoute = express.Router();

profileRoute.get("/me", authenticate, getMyProfile);
profileRoute.patch(
  "/me",
  authenticate,
  uploadProfileImage,
  validateProfileImageType,
  updateMyProfile
);
profileRoute.get("/:userId", authenticate, getProfileByUserId);

export default profileRoute;
