import express from "express";
import {
  getAllCommunities,
  getCommunityById,
  getCommunityJoinRequests,
  getCommunityMembers,
} from "../controllers/community.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const communityRoute = express();

communityRoute.get("/", getAllCommunities);
communityRoute.get("/:postId", getCommunityById);
communityRoute.get(
  "/:postId/join-requests",
  authenticate,
  getCommunityJoinRequests,
);
communityRoute.get("/:postId/members", getCommunityMembers);

export default communityRoute;
