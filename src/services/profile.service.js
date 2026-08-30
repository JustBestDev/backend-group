import { prisma } from "../lib/prisma.js";

const profileSelect = {
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
};

export const findProfileByUserId = async (userId) => {
  return await prisma.profile.findUnique({
    where: {
      userId: Number(userId),
    },
    select: profileSelect,
  });
};

export const updateProfileByUserId = async (userId, profileData) => {
  const existingProfile = await prisma.profile.findUnique({
    where: {
      userId: Number(userId),
    },
    select: {
      id: true,
    },
  });

  if (!existingProfile) {
    return null;
  }

  return await prisma.profile.update({
    where: {
      userId: Number(userId),
    },
    data: {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      phone: profileData.phone,
      profileImageUrl: profileData.profileImageUrl,
      bio: profileData.bio,
      gender: profileData.gender,
      birthdate: profileData.birthdate,
      occupation: profileData.occupation,
      currentAddress: profileData.currentAddress,
    },
    select: profileSelect,
  });
};
