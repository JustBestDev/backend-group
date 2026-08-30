import express from "express";

import { getMyProfile } from "../controllers/profile.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const profileRoute = express.Router();

profileRoute.get("/me", authenticate, getMyProfile);

export default profileRoute;
