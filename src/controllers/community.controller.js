import {
  createCommunityPostService,
  deleteCommunityPostService,
  getAllCommunitiesByIdService,
  getAllCommunitiesService,
  getCommunityJoinRequestsService,
  getCommunityMembersService,
  joinRequestCommunityPostService,
  updateCommunityPostService,
} from "../services/community.service.js";
import {
  communityPostSchema,
  updateCommunityPostSchema,
} from "../validations/schema.js";
import createError from "http-errors";

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

// Patch update communities post
export const updateCommunityPost = async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);

    if (!Number.isInteger(postId) || postId <= 0) {
      throw createError(400, "Invalid post ID");
    }

    const postData = updateCommunityPostSchema.parse(req.body);
    const { id } = req.user;
    // console.log('postData', postData)
    // console.log('postId', postId)
    // console.log('id', id)
    const result = await updateCommunityPostService(postData, id, postId);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

// Post create community post
export const createCommunityPost = async (req, res, next) => {
  try {
    const postData = communityPostSchema.parse(req.body);
    const { id } = req.user;
    const result = await createCommunityPostService(postData, id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

// Post Join request community post
export const joinRequestCommunityPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { message } = req.body;
    const { id } = req.user;
    const result = await joinRequestCommunityPostService(postId, message, id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

// Delete community post
export const deleteCommunityPost = async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);

    if (!Number.isInteger(postId) || postId <= 0) {
      throw createError(400, "Invalid post ID");
    }

    const { id } = req.user;
    const result = await deleteCommunityPostService(postId, id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
