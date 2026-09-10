import { prisma } from "../lib/prisma.js";
import createError from "http-errors";
import { activeRentalTargetWhere } from "./rental.service.js";
import {
  CommunityPostStatus,
  PropertyStatus,
  PublishStatus,
} from "../../generated/prisma/client.js";
import {
  getCompatibility,
  getZodiacSign,
} from "../utils/zodiac.js";
import { generateZodiacExplanation } from "./openai.service.js";

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
      rentType: true,
    },
  });

  if (!property) {
    throw createError(404, "Property not found");
  }

  const activeRental = await prisma.rental.findFirst({
    where: activeRentalTargetWhere(
      property.id,
      property.rentType,
      null,
    ),
    select: { id: true },
  });

  if (activeRental) {
    throw createError(
      409,
      "Property is currently reserved or rented, and cannot be shared to community",
    );
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
        joinRequests: {
          select: {
            id: true,
            userId: true,
            status: true,
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
          select: communityPostCreatorSelect,
        },
        joinRequests: {
          select: {
            id: true,
            userId: true,
            status: true,
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

export async function getZodiacMatchesService(
  userId,
  database = prisma,
  explanationGenerator = generateZodiacExplanation,
) {
  try {
    const user = await database.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        profile: { select: { birthdate: true } },
      },
    });

    if (!user) {
      throw createError(404, "User not found");
    }

    const userZodiac = getZodiacSign(user.profile?.birthdate);
    if (!userZodiac) {
      throw createError(400, "Birthdate is required for zodiac matching");
    }

    const communities = await database.communityPost.findMany({
      where: {
        status: { not: CommunityPostStatus.CLOSED },
        property: {
          deletedAt: null,
          publishStatus: PublishStatus.APPROVED,
          propertyStatus: PropertyStatus.AVAILABLE,
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        requiredMembers: true,
        status: true,
        property: {
          select: {
            id: true,
            title: true,
            monthlyRent: true,
            rentType: true,
            propertyType: true,
            images: { select: { id: true, imageUrl: true, isCover: true } },
            address: true,
          },
        },
        members: {
          select: {
            memberRole: true,
            user: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: {
                    firstName: true,
                    profileImageUrl: true,
                    birthdate: true,
                  },
                },
              },
            },
          },
        },
        joinRequests: {
          select: {
            id: true,
            userId: true,
            status: true,
          },
        },
      },
    });

    const matches = communities.map((community) => {
      const scores = [];
      const compatibilityReasons = new Set();
      const members = community.members.map((member) => {
        const zodiac = getZodiacSign(member.user.profile?.birthdate);
        const compatibility = member.user.id !== user.id && zodiac
          ? getCompatibility(userZodiac, zodiac)
          : null;

        if (compatibility) {
          scores.push(compatibility.score);
          for (const reason of compatibility.reasons) {
            if (compatibilityReasons.size === 4) break;
            compatibilityReasons.add(reason);
          }
        }

        return {
          ...member,
          user: {
            ...member.user,
            profile: member.user.profile
              ? {
                  firstName: member.user.profile.firstName,
                  profileImageUrl: member.user.profile.profileImageUrl,
                  zodiac,
                }
              : null,
          },
          compatibility,
        };
      });

      return {
        ...community,
        members,
        compatibilityScore: scores.length
          ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
          : null,
        compatibilityReasons: [...compatibilityReasons],
        matchedMembers: scores.length,
        totalMembers: community.members.length,
        isMember: community.members.some((member) => member.user.id === user.id),
      };
    });

    matches.sort((a, b) =>
      (b.compatibilityScore ?? -1) - (a.compatibilityScore ?? -1) || a.id - b.id
    );

    const explanationCache = new Map();
    const matchesWithExplanations = await Promise.all(
      matches.map(async (match) => {
        const memberZodiacs = match.members
          .filter(({ compatibility }) => compatibility)
          .map(({ user: member }) => member.profile.zodiac)
          .sort();

        if (match.compatibilityScore == null || !memberZodiacs.length) {
          return { ...match, aiExplanation: null };
        }

        const input = {
          userZodiac,
          memberZodiacs,
          compatibilityScore: match.compatibilityScore,
          compatibilityReasons: match.compatibilityReasons,
        };
        const cacheKey = JSON.stringify(input);
        if (!explanationCache.has(cacheKey)) {
          explanationCache.set(
            cacheKey,
            Promise.resolve()
              .then(() => explanationGenerator(input))
              .catch(() => null),
          );
        }

        return {
          ...match,
          aiExplanation: await explanationCache.get(cacheKey),
        };
      }),
    );

    return { userZodiac, matches: matchesWithExplanations };
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
