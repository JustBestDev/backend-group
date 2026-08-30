import {
  getAllCommunitiesByIdService,
  getAllCommunitiesService,
  getCommunityJoinRequestsService,
  getCommunityMembersService,
} from "../services/community.service.js";

// Get all communities
export const getAllCommunities = async (req, res, next) => {
  try {
    const result = await getAllCommunitiesService();
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

// Get community by postId
export const getCommunityById = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const result = await getAllCommunitiesByIdService(postId);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

// Get join requests for a community
export const getCommunityJoinRequests = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { id } = req.user;
    const result = await getCommunityJoinRequestsService(postId, id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

// Get members of a community
export const getCommunityMembers = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const result = await getCommunityMembersService(postId);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
