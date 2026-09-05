import { prisma } from "../lib/prisma.js";
import createError from "http-errors";
import {
  PropertyStatus,
  PublishStatus,
} from "../../generated/prisma/client.js";

const communityPostCreatorSelect = {
  id: true,
  username: true,
  profile: {
    select: {
      firstName: true,
      profileImageUrl: true,
      isVerified: true,
    },
  },
};

const communityMemberSelect = {
  id: true,
  username: true,
  profile: {
    select: {
      firstName: true,
      profileImageUrl: true,
      bio: true,
      gender: true,
      occupation: true,
      isVerified: true,
    },
  },
};

async function ensureCommunityPostPropertyIsAvailable(propertyId) {
  const property = await prisma.property.findFirst({
    where: {
      id: Number(propertyId),
      deletedAt: null,
      publishStatus: PublishStatus.APPROVED,
      propertyStatus: PropertyStatus.AVAILABLE,
    },
    select: {
      id: true,
    },
  });

  if (!property) {
    throw createError(404, "Property not found");
  }
}

export async function getAllCommunitiesService() {
  try {
    const communities = await prisma.communityPost.findMany({
      include: {
        property: {
          include: {
            images: true,
            address: true,
          },
        },
        creator: {
          select: communityPostCreatorSelect,
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
          select: communityPostCreatorSelect,
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
          select: communityMemberSelect,
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
          select: communityMemberSelect,
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
    const communityPost = await prisma.communityPost.findUnique({
      where: {
        id: Number(postId),
      },
      select: {
        id: true,
        creatorId: true,
      },
    });

    if (!communityPost) {
      throw createError(404, "Community post not found");
    }

    if (communityPost.creatorId !== Number(creatorId)) {
      throw createError(403, "Forbidden");
    }

    // Validate a replacement property only when the patch includes propertyId.
    if (postData.propertyId !== undefined) {
      await ensureCommunityPostPropertyIsAvailable(postData.propertyId);
    }

    const updateCommunityPost = await prisma.communityPost.update({
      where: {
        id: Number(postId),
      },
      data: {
        title: postData.title,
        description: postData.description,
        requiredMembers: postData.requiredMembers,
        status: postData.status,
        ...(postData.propertyId !== undefined && {
          property: {
            connect: {
              id: Number(postData.propertyId),
            },
          },
        }),
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
    // A new post must reference an eligible property.
    await ensureCommunityPostPropertyIsAvailable(postData.propertyId);

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

export async function joinRequestCommunityPostService(postId, message, userId) {
  try {
    const communityPost = await prisma.communityPost.findUnique({
      where: {
        id: Number(postId),
      },
    });
    if (!communityPost) {
      throw createError(400, "Community Post not found");
    }

    const alreadyRequested = await prisma.joinRequest.findFirst({
      where: {
        userId: Number(userId),
        communityPostId: Number(postId),
      },
    });
    if (alreadyRequested) {
      throw createError(400, "You already have join requested");
    }

    const insertJoinRequest = await prisma.joinRequest.create({
      data: {
        message: message,
        communityPost: {
          connect: {
            id: Number(postId),
          },
        },
        user: {
          connect: {
            id: Number(userId),
          },
        },
      },
    });
    return insertJoinRequest;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function deleteCommunityPostService(postId, creatorId) {
  try {
    const communityPost = await prisma.communityPost.findUnique({
      where: {
        id: Number(postId),
      },
      select: {
        id: true,
        creatorId: true,
      },
    });

    if (!communityPost) {
      throw createError(404, "Community post not found");
    }

    if (communityPost.creatorId !== Number(creatorId)) {
      throw createError(403, "Forbidden");
    }

    const deleteCommunityPost = await prisma.communityPost.delete({
      where: {
        id: Number(postId),
        creatorId: Number(creatorId),
      },
    });
    return deleteCommunityPost;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    if (error.code === "P2025") {
      throw createError(404, "Community post not found");
    }
    throw createError(500, error.message);
  }
}
