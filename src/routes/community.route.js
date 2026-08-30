import express from "express";
import {
  createCommunityPost,
  deleteCommunityPost,
  getAllCommunities,
  getCommunityById,
  getCommunityJoinRequests,
  getCommunityMembers,
  joinRequestCommunityPost,
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
communityRoute.patch("/:postId", authenticate, updateCommunityPost);
communityRoute.post("/", authenticate, createCommunityPost);
communityRoute.post(
  "/:postId/join-requests",
  authenticate,
  joinRequestCommunityPost,
);
communityRoute.delete("/:postId", authenticate, deleteCommunityPost);

export default communityRoute;
