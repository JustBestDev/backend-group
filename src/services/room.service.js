import { prisma } from "../lib/prisma.js";
import createError from "http-errors";

export async function deleteRoomService(roomId, userId) {
  try {
    const room = await prisma.room.findFirst({
      where: {
        id: Number(roomId),
      },
      include: {
        property: true,
      },
    });
    if (!room) {
      throw createError(400, "Room not found");
    }
    if (room.property.ownerId !== Number(userId)) {
      throw createError(401, "You are not the owner");
    }

    const deleteRoom = await prisma.room.delete({
      where: {
        id: Number(roomId),
      },
    });
    return deleteRoom;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function updateRoomService(params) {
  try {
    const updateRoom = await prisma.room.findFirst({});
    return updateRoom;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}
