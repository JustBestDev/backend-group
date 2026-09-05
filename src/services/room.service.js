import { prisma } from "../lib/prisma.js";
import createError from "http-errors";
import {
  deleteRoomImageFromCloudinary,
  deleteUploadedRoomImage,
  uploadRoomImageToCloudinary,
} from "../utils/uploadCloudRoom.js";

export async function deleteRoomImageService(roomId, imageId, ownerId) {
  const parsedRoomId = Number(roomId);
  const parsedImageId = Number(imageId);

  if (!Number.isInteger(parsedRoomId) || parsedRoomId < 1) {
    throw createError(400, "Invalid room ID");
  }

  if (!Number.isInteger(parsedImageId) || parsedImageId < 1) {
    throw createError(400, "Invalid image ID");
  }

  const room = await prisma.room.findFirst({
    where: {
      id: parsedRoomId,
      property: {
        is: { deletedAt: null },
      },
    },
    select: {
      propertyId: true,
      property: {
        select: { ownerId: true },
      },
    },
  });

  if (!room) {
    throw createError(404, "Room not found");
  }

  if (room.property.ownerId !== Number(ownerId)) {
    throw createError(403, "You are not the owner of this room");
  }

  const image = await prisma.roomImage.findFirst({
    where: {
      id: parsedImageId,
      roomId: parsedRoomId,
    },
  });

  if (!image) {
    throw createError(404, "Room image not found");
  }

  await deleteRoomImageFromCloudinary(image.imageUrl, image.cloudinaryPublicId);

  await prisma.$transaction(async (tx) => {
    await tx.roomImage.delete({
      where: { id: parsedImageId },
    });

    await tx.property.update({
      where: { id: room.propertyId },
      data: {
        publishStatus: "PENDING",
        rejectReason: null,
      },
    });
  });

  return {
    id: image.id,
    roomId: image.roomId,
    imageUrl: image.imageUrl,
  };
}

export async function createRoomImageService(roomId, ownerId, file) {
  const parsedRoomId = Number(roomId);

  if (!Number.isInteger(parsedRoomId) || parsedRoomId < 1) {
    throw createError(400, "Invalid room ID");
  }

  if (!file) {
    throw createError(400, "Room image is required");
  }

  const room = await prisma.room.findFirst({
    where: {
      id: parsedRoomId,
      property: {
        is: { deletedAt: null },
      },
    },
    select: {
      propertyId: true,
      property: {
        select: { ownerId: true },
      },
      _count: {
        select: { images: true },
      },
    },
  });

  if (!room) {
    throw createError(404, "Room not found");
  }

  if (room.property.ownerId !== Number(ownerId)) {
    throw createError(403, "You are not the owner of this room");
  }

  if (room._count.images >= 1) {
    throw createError(409, "This room already has an image");
  }

  const cloudImage = await uploadRoomImageToCloudinary(file, parsedRoomId);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const currentImageCount = await tx.roomImage.count({
          where: { roomId: parsedRoomId },
        });

        if (currentImageCount >= 1) {
          throw createError(409, "This room already has an image");
        }

        const image = await tx.roomImage.create({
          data: {
            roomId: parsedRoomId,
            imageUrl: cloudImage.imageUrl,
            cloudinaryPublicId: cloudImage.publicId,
            isCover: true,
          },
        });

        await tx.property.update({
          where: { id: room.propertyId },
          data: {
            publishStatus: "PENDING",
            rejectReason: null,
          },
        });

        return image;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    await deleteUploadedRoomImage(cloudImage.publicId);
    if (error.status) throw error;
    throw createError(500, error.message);
  }
}

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

export async function getRoomService(roomId) {
  try {
    const room = await prisma.room.findUnique({
      where: {
        id: Number(roomId),
      },
      include: {
        images: true,
      },
    });
    if (!room) {
      throw createError(401, "Invalid room id");
    }
    return room;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}
