import { prisma } from "../lib/prisma.js";

export const findProfileByUserId = async (userId) => {
  return await prisma.profile.findUnique({
    where: {
      userId: Number(userId),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      profileImageUrl: true,
      bio: true,
      gender: true,
      birthdate: true,
      occupation: true,
      currentAddress: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
        },
      },
    },
  });
};
