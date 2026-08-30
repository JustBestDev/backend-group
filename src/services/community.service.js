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
