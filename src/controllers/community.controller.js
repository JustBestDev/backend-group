import {
  getAllCommunitiesByIdService,
  getAllCommunitiesService,
  getCommunityJoinRequestsService,
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
export const getCommunityMembers = (req, res, next) => {
  try {
    const { postId } = req.params;
    const mockData = [
      {
        id: 1,
        userId: 201,
        username: "member_one",
        email: "member1@example.com",
        joinedAt: new Date(),
        role: "admin",
      },
      {
        id: 2,
        userId: 202,
        username: "member_two",
        email: "member2@example.com",
        joinedAt: new Date(),
        role: "member",
      },
      {
        id: 3,
        userId: 203,
        username: "member_three",
        email: "member3@example.com",
        joinedAt: new Date(),
        role: "member",
      },
    ];
    return res.status(200).json(mockData);
  } catch (error) {
    return next(error);
  }
};
