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

export async function updateRoomService(roomId, body, userId) {
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
    if (room.property.ownerId !== userId) {
      throw createError(401, "You are not the owner");
    }

    const updateRoom = await prisma.room.update({
      where: {
        id: Number(roomId),
      },
      data: {
        roomName: body.roomName,
        description: body.description,
        monthlyRent: body.monthlyRent,
        status: body.status,
        capacity: body.capacity,
      },
    });
    return updateRoom;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}
