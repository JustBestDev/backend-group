import express from "express";
import {
  createCommunityPost,
  getAllCommunities,
  getCommunityById,
  getCommunityJoinRequests,
  getCommunityMembers,
  updateCommunityPost,
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
communityRoute.patch("/:postId", updateCommunityPost);
communityRoute.post("/", authenticate, createCommunityPost);

export default communityRoute;
