import { prisma } from "../lib/prisma.js";
import createError from "http-errors";

export async function getAllCommunitiesService() {
  try {
    const communities = await prisma.communityPost.findMany({
      include: {
        property: true,
        creator: {
          select: {
            email: true,
            profile: true,
          },
        },
      },
    });
    return communities;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function getAllCommunitiesByIdService(postId) {
  try {
    const communities = await prisma.communityPost.findUnique({
      where: {
        id: Number(postId),
      },
      include: {
        property: true,
        creator: {
          select: {
            email: true,
            profile: true,
          },
        },
      },
    });
    return communities;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function getCommunityJoinRequestsService(postId, id) {
  try {
    const communityPost = await prisma.communityPost.findUnique({
      where: {
        id: Number(postId),
      },
    });

    if (!communityPost) {
      throw createError(400, "Community post not found");
    }

    if (communityPost.creatorId !== Number(id)) {
      throw createError(403, "You are not the creator of this post");
    }

    const joinRequest = await prisma.joinRequest.findMany({
      where: {
        communityPostId: Number(postId),
      },
      include: {
        user: {
          select: {
            email: true,
            profile: true,
          },
        },
      },
    });
    return joinRequest;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function getCommunityMembersService(postId) {
  try {
    const communityMember = await prisma.communityMember.findMany({
      where: {
        communityPostId: Number(postId),
      },
      include: {
        user: {
          select: {
            email: true,
            profile: true,
          },
        },
      },
    });
    return communityMember;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function updateCommunityPostService(postData, creatorId, postId) {
  try {
    // เช็ค property มีอยู่หรือไม่
    const property = await prisma.property.findUnique({
      where: {
        id: Number(postData.propertyId),
      },
    });
    if (!property) {
      throw createError(400, "Property not found");
    }
    const updateCommunityPost = await prisma.communityPost.update({
      where: {
        id: Number(postId),
      },
      data: {
        title: postData.title,
        description: postData.description,
        requiredMembers: postData.requiredMembers,
        status: postData.status || "OPEN",
        property: {
          connect: {
            id: Number(postData.propertyId),
          },
        },
        creator: {
          connect: {
            id: Number(creatorId),
          },
        },
      },
    });
    return updateCommunityPost;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function createCommunityPostService(postData, creatorId) {
  try {
    // เช็ค property มีอยู่หรือไม่
    const property = await prisma.property.findUnique({
      where: {
        id: Number(postData.propertyId),
      },
    });

    if (!property) {
      throw createError(400, "Property not found");
    }

    const createCommunityPost = await prisma.communityPost.create({
      data: {
        title: postData.title,
        description: postData.description,
        requiredMembers: postData.requiredMembers,
        status: postData.status || "OPEN",
        property: {
          connect: {
            id: Number(postData.propertyId),
          },
        },
        creator: {
          connect: {
            id: Number(creatorId),
          },
        },
      },
    });
    return createCommunityPost;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}
