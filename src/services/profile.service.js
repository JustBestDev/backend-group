import { prisma } from "../lib/prisma.js";
import createError from "http-errors";
import {
  deleteProfileImageFromCloudinary,
  uploadProfileImageToCloudinary,
} from "../utils/uploadCloudProfile.js";

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

const publicProfileSelect = {
  firstName: true,
  profileImageUrl: true,
  bio: true,
  gender: true,
  occupation: true,
  isVerified: true,
  user: {
    select: {
      id: true,
      username: true,
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

export const findPublicProfileByUserId = async (userId) => {
  return await prisma.profile.findUnique({
    where: {
      userId: Number(userId),
    },
    select: publicProfileSelect,
  });
};

export const updateProfileByUserId = async (userId, profileData, profileImage) => {
  const { username, ...profileFields } = profileData;
  const existingProfile = await prisma.profile.findUnique({
    where: {
      userId: Number(userId),
    },
    select: {
      id: true,
      profileImageUrl: true,
    },
  });

  if (!existingProfile) {
    return null;
  }

  if (username) {
    const usernameOwner = await prisma.user.findUnique({ where: { username } });
    if (usernameOwner && usernameOwner.id !== Number(userId)) {
      throw createError(409, "Username already exists");
    }
  }

  let uploadedImage;

  if (profileImage) {
    uploadedImage = await uploadProfileImageToCloudinary(profileImage, userId);
  }

  try {
    const profile = await prisma.profile.update({
      where: {
        userId: Number(userId),
      },
      data: {
        ...profileFields,
        ...(username && { user: { update: { username } } }),
        ...(uploadedImage && { profileImageUrl: uploadedImage.imageUrl }),
      },
      select: profileSelect,
    });

    if (
      uploadedImage &&
      existingProfile.profileImageUrl &&
      existingProfile.profileImageUrl !== uploadedImage.imageUrl
    ) {
      try {
        await deleteProfileImageFromCloudinary(existingProfile.profileImageUrl);
      } catch (error) {
        console.error("Old profile image cleanup failed", {
          userId: Number(userId),
          imageUrl: existingProfile.profileImageUrl,
          error,
        });
      }
    }

    return profile;
  } catch (error) {
    if (uploadedImage) {
      try {
        await deleteProfileImageFromCloudinary(null, uploadedImage.publicId);
      } catch (cleanupError) {
        console.error("New profile image cleanup failed after profile update", {
          userId: Number(userId),
          publicId: uploadedImage.publicId,
          error: cleanupError,
        });
      }
    }

    throw error;
  }
};
