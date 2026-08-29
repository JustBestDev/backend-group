import { prisma } from "../lib/prisma.js";

export async function getRoomPropertyById(propertyId) {
  try {
    const property = await prisma.property.findUnique({
      where: {
        id: Number(propertyId),
      },
      include: {
        owner: {
          select: {
            email: true,
            profile: true,
          },
        },
      },
    });
    if (!property) {
      return {
        status: false,
        errorMessage: "Property not found",
        data: null,
      };
    }

    const rooms = await prisma.room.findMany({
      where: {
        propertyId: Number(propertyId),
        status: "AVAILABLE",
      },
    });
    if (!rooms) {
      return {
        status: false,
        errorMessage: "Room not found",
        data: null,
      };
    }
    return {
      status: true,
      errorMessage: "",
      data: {
        property: property,
        rooms: rooms,
      },
    };
  } catch (error) {
    throw error;
  }
}
