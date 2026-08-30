import { prisma } from "../lib/prisma.js";

export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: {
      email,
    },
  });
};

export const findUserByUsername = async (
  username
) => {
  return await prisma.user.findUnique({
    where: {
      username,
    },
  });
};

export const findUserById = async (id) => {
  return await prisma.user.findUnique({
    where: {
      id: Number(id),
    },

    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const createUser = async (
  username,
  email,
  hashedPassword
) => {
  return await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
    },

    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
};