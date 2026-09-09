import { prisma } from "../lib/prisma.js";
import createError from "http-errors";

export async function getAmenitiesService() {
  try {
    return await prisma.amenity.findMany({ orderBy: { id: "asc" } });
  } catch (error) {
    throw createError(500, error.message);
  }
}

export async function getHouseRulesService() {
  try {
    return await prisma.houseRule.findMany({ orderBy: { id: "asc" } });
  } catch (error) {
    throw createError(500, error.message);
  }
}
