import { prisma } from "../lib/prisma.js";
import createError from "http-errors";

export async function updatePropertyService(propertyId, ownerId, body) {
  try {
    const parsedPropertyId = Number(propertyId);

    if (!Number.isInteger(parsedPropertyId) || parsedPropertyId < 1) {
      throw createError(400, "Invalid property ID");
    }

    const property = await prisma.property.findUnique({
      where: {
        id: parsedPropertyId,
      },
      select: {
        ownerId: true,
      },
    });

    if (!property) {
      throw createError(404, "Property not found");
    }

    if (property.ownerId !== Number(ownerId)) {
      throw createError(403, "You are not the owner of this property");
    }

    return await prisma.property.update({
      where: {
        id: parsedPropertyId,
      },
      data: {
        ...body,
        publishStatus: "PENDING",
        rejectReason: null,
      },
      include: {
        address: true,
        images: true,
        rooms: true,
      },
    });
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function updatePropertyAddressService(propertyId, ownerId, body) {
  try {
    const parsedPropertyId = Number(propertyId);

    if (!Number.isInteger(parsedPropertyId) || parsedPropertyId < 1) {
      throw createError(400, "Invalid property ID");
    }

    const property = await prisma.property.findUnique({
      where: {
        id: parsedPropertyId,
      },
      select: {
        ownerId: true,
        address: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!property) {
      throw createError(404, "Property not found");
    }

    if (property.ownerId !== Number(ownerId)) {
      throw createError(403, "You are not the owner of this property");
    }

    if (!property.address) {
      throw createError(404, "Property address not found");
    }

    return await prisma.propertyAddress.update({
      where: {
        propertyId: parsedPropertyId,
      },
      data: body,
    });
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function createPropertyAddressService(propertyId, ownerId, body) {
  try {
    const parsedPropertyId = Number(propertyId);

    if (!Number.isInteger(parsedPropertyId) || parsedPropertyId < 1) {
      throw createError(400, "Invalid property ID");
    }

    const property = await prisma.property.findUnique({
      where: {
        id: parsedPropertyId,
      },
      select: {
        ownerId: true,
        address: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!property) {
      throw createError(404, "Property not found");
    }

    if (property.ownerId !== Number(ownerId)) {
      throw createError(403, "You are not the owner of this property");
    }

    if (property.address) {
      throw createError(409, "Property address already exists");
    }

    return await prisma.propertyAddress.create({
      data: {
        propertyId: parsedPropertyId,
        province: body.province,
        district: body.district,
        subDistrict: body.subDistrict,
        postcode: body.postcode,
        road: body.road,
        building: body.building,
        latitude: body.latitude,
        longitude: body.longitude,
      },
    });
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function createPropertyService(ownerId, body) {
  try {
    return await prisma.property.create({
      data: {
        ownerId: Number(ownerId),
        title: body.title,
        description: body.description,
        propertyType: body.propertyType,
        rentType: body.rentType,
        monthlyRent: body.monthlyRent,
        deposit: body.deposit,
        availableDate: body.availableDate,
        totalBedrooms: body.totalBedrooms,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

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
      throw createError(400, "Property not found");
    }

    const rooms = await prisma.room.findMany({
      where: {
        propertyId: Number(propertyId),
        status: "AVAILABLE",
      },
    });
    if (!rooms) {
      throw createError(400, "Room not found");
    }
    return {
      status: "",
      message: "",
      data: {
        property: property,
        rooms: rooms,
      },
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function createRoomPropertyById(propertyId, userId, body) {
  try {
    const property = await prisma.property.findUnique({
      where: {
        id: Number(propertyId),
      },
      include: {
        rooms: true,
      },
    });
    if (!property) {
      throw createError(400, "Property not found");
    }
    if (property.ownerId !== userId) {
      throw createError(400, "You are not the owner of this property");
    }

    const createRoom = await prisma.room.create({
      data: {
        roomName: body.roomName,
        description: body.description,
        monthlyRent: body.monthlyRent,
        status: body.status || "AVAILABLE",
        capacity: body.capacity,
        propertyId: Number(propertyId),
      },
    });

    //TODO: room มีเชื่อม rental ด้วยไม่แน่ใจมันคืออะไรลองมาเช็คอีกที

    return {
      status: "success",
      message: "Room created successfully",
      data: createRoom,
    };

  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}
