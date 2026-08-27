import { prisma } from "../lib/prisma.js";

export const findUserByEmail = async (email) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserByUsername = async (username) => {
  return prisma.user.findUnique({
    where: { username },
  });
};

export const findUserById = async (id) => {
  return prisma.user.findFirst({ where: { id } });
};

export const createUser = async (username, email, hashPassword) => {
  return prisma.user.create({
    data: { username, email, password: hashPassword },
  });
};