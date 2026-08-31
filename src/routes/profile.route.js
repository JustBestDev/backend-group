import express from "express";

import {
  getMyProfile,
  getProfileByUserId,
  updateMyProfile,
} from "../controllers/profile.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const profileRoute = express.Router();

profileRoute.get("/me", authenticate, getMyProfile);
profileRoute.patch("/me", authenticate, updateMyProfile);
profileRoute.get("/:userId", authenticate, getProfileByUserId);

export default profileRoute;
