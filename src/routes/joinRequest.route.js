import express from "express";
import { updateJoinRequest } from "../controllers/joinRequest.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const joinRequestRoute = express();

joinRequestRoute.patch("/:requestId", authenticate, updateJoinRequest);

export default joinRequestRoute;
