import express from "express";

import {
  getMyProfile,
  updateMyProfile,
} from "../controllers/profile.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const profileRoute = express.Router();

profileRoute.get("/me", authenticate, getMyProfile);
profileRoute.patch("/me", authenticate, updateMyProfile);

export default profileRoute;
