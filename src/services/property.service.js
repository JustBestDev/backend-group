import { prisma } from "../lib/prisma.js";
import createError from "http-errors";
import {
  deleteCloudinaryImages,
  deleteImageFromCloudinary,
  MAX_PROPERTY_IMAGES,
  uploadImagesToCloudinary,
} from "../utils/uploadCloudProperty.js";

export async function checkPropertyImageCapacityService(
  propertyId,
  ownerId,
  newImageCount
) {
  const parsedPropertyId = Number(propertyId);

  if (!Number.isInteger(parsedPropertyId) || parsedPropertyId < 1) {
    throw createError(400, "Invalid property ID");
  }

  if (!Number.isInteger(newImageCount) || newImageCount < 1) {
    throw createError(400, "At least one image is required");
  }

  const property = await prisma.property.findFirst({
    where: {
      id: parsedPropertyId,
      deletedAt: null,
    },
    select: {
      ownerId: true,
      _count: {
        select: { images: true },
      },
    },
  });

  if (!property) {
    throw createError(404, "Property not found");
  }

  if (property.ownerId !== Number(ownerId)) {
    throw createError(403, "You are not the owner of this property");
  }

  const remainingSlots = MAX_PROPERTY_IMAGES - property._count.images;
  if (newImageCount > remainingSlots) {
    throw createError(
      409,
      remainingSlots === 0
        ? `This property already has the maximum of ${MAX_PROPERTY_IMAGES} images`
        : `Only ${remainingSlots} more image(s) can be added`
    );
  }

  return {
    currentImageCount: property._count.images,
    remainingSlots,
  };
}

export async function deletePropertyImageService(propertyId, imageId, ownerId) {
  const parsedPropertyId = Number(propertyId);
  const parsedImageId = Number(imageId);

  if (!Number.isInteger(parsedPropertyId) || parsedPropertyId < 1) {
    throw createError(400, "Invalid property ID");
  }

  if (!Number.isInteger(parsedImageId) || parsedImageId < 1) {
    throw createError(400, "Invalid image ID");
  }

  const property = await prisma.property.findFirst({
    where: {
      id: parsedPropertyId,
      deletedAt: null,
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

  const image = await prisma.propertyImage.findFirst({
    where: {
      id: parsedImageId,
      propertyId: parsedPropertyId,
    },
  });

  if (!image) {
    throw createError(404, "Property image not found");
  }

  await deleteImageFromCloudinary(image.imageUrl, image.cloudinaryPublicId);

  await prisma.$transaction(async (tx) => {
    await tx.propertyImage.delete({
      where: {
        id: parsedImageId,
      },
    });

    if (image.isCover) {
      const nextCover = await tx.propertyImage.findFirst({
        where: {
          propertyId: parsedPropertyId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (nextCover) {
        await tx.propertyImage.update({
          where: {
            id: nextCover.id,
          },
          data: {
            isCover: true,
          },
        });
      }
    }

    await tx.property.update({
      where: { id: parsedPropertyId },
      data: { publishStatus: "PENDING", rejectReason: null },
    });
  });

  return {
    id: image.id,
    imageUrl: image.imageUrl,
  };
}

export async function createPropertyImagesService(propertyId, ownerId, files) {
  const parsedPropertyId = Number(propertyId);

  if (!Number.isInteger(parsedPropertyId) || parsedPropertyId < 1) {
    throw createError(400, "Invalid property ID");
  }

  if (!files?.length) {
    throw createError(400, "At least one image is required");
  }

  const property = await prisma.property.findFirst({
    where: {
      id: parsedPropertyId,
      deletedAt: null,
    },
    select: {
      ownerId: true,
      _count: {
        select: {
          images: true,
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

  if (property._count.images + files.length > MAX_PROPERTY_IMAGES) {
    throw createError(
      409,
      `A property can have no more than ${MAX_PROPERTY_IMAGES} images; ${property._count.images} already exist`
    );
  }

  const cloudImages = await uploadImagesToCloudinary(files, parsedPropertyId);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const currentImageCount = await tx.propertyImage.count({
          where: {
            propertyId: parsedPropertyId,
          },
        });

        if (currentImageCount + cloudImages.length > MAX_PROPERTY_IMAGES) {
          throw createError(409, "The property image limit was reached during upload");
        }

        const createdImages = [];
        for (let index = 0; index < cloudImages.length; index += 1) {
          const image = await tx.propertyImage.create({
            data: {
              propertyId: parsedPropertyId,
              imageUrl: cloudImages[index].imageUrl,
              cloudinaryPublicId: cloudImages[index].publicId,
              isCover: currentImageCount === 0 && index === 0,
            },
          });
          createdImages.push(image);
        }

        await tx.property.update({
          where: { id: parsedPropertyId },
          data: { publishStatus: "PENDING", rejectReason: null },
        });

        return createdImages;
      },
      { isolationLevel: "Serializable" }
    );
  } catch (error) {
    await deleteCloudinaryImages(cloudImages.map((image) => image.publicId));
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function getPropertiesService(query) {
  try {
    const where = {
      publishStatus: "APPROVED",
      deletedAt: null,
      ...(query.q ? { OR: [{ title: { contains: query.q } }, { description: { contains: query.q } }] } : {}),
      ...(query.propertyType ? { propertyType: query.propertyType } : {}),
      ...(query.rentType ? { rentType: query.rentType } : {}),
      ...(query.propertyStatus ? { propertyStatus: query.propertyStatus } : {}),
      ...(query.province ? { address: { is: { province: { contains: query.province } } } } : {}),
      ...(query.minRent !== undefined || query.maxRent !== undefined
        ? {
          monthlyRent: {
            ...(query.minRent !== undefined ? { gte: query.minRent } : {}),
            ...(query.maxRent !== undefined ? { lte: query.maxRent } : {}),
          },
        } : {}),
    };

    const skip = (query.page - 1) * query.limit;
    const [properties, total] = await prisma.$transaction([
      prisma.property.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              profile: true,
            },
          },
          address: true,
          images: {
            select: { id: true, imageUrl: true, isCover: true, createdAt: true },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: query.limit,
      }),
      prisma.property.count({ where }),
    ]);

    return {
      properties,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function deletePropertyService(propertyId, ownerId) {
  try {
    const parsedPropertyId = Number(propertyId);

    if (!Number.isInteger(parsedPropertyId) || parsedPropertyId < 1) {
      throw createError(400, "Invalid property ID");
    }

    const property = await prisma.property.findFirst({
      where: {
        id: parsedPropertyId,
        deletedAt: null,
      },
      select: {
        id: true,
        ownerId: true,
        title: true,
      },
    });

    if (!property) {
      throw createError(404, "Property not found");
    }

    if (property.ownerId !== Number(ownerId)) {
      throw createError(403, "You are not the owner of this property");
    }

    await prisma.property.update({
      where: {
        id: parsedPropertyId,
      },
      data: {
        deletedAt: new Date(),
        propertyStatus: "CLOSED",
      },
    });

    return {
      id: property.id,
      title: property.title,
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function getMyPropertiesService(ownerId) {
  try {
    return await prisma.property.findMany({
      where: {
        ownerId: Number(ownerId),
        deletedAt: null,
      },
      include: {
        address: true,
        images: {
          select: { id: true, imageUrl: true, isCover: true, createdAt: true },
          orderBy: {
            createdAt: "asc",
          },
        },
        rooms: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function getPropertyByIdService(propertyId, viewerId) {
  try {
    const parsedPropertyId = Number(propertyId);

    if (!Number.isInteger(parsedPropertyId) || parsedPropertyId < 1) {
      throw createError(400, "Invalid property ID");
    }

    const property = await prisma.property.findFirst({
      where: {
        id: parsedPropertyId,
        deletedAt: null,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                profileImageUrl: true,
              },
            },
          },
        },
        address: true,
        images: {
          select: { id: true, imageUrl: true, isCover: true, createdAt: true },
          orderBy: {
            createdAt: "asc",
          },
        },
        rooms: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!property) {
      throw createError(404, "Property not found");
    }

    if (property.publishStatus !== "APPROVED") {
      if (!viewerId) throw createError(404, "Property not found");

      const viewer = await prisma.user.findUnique({
        where: { id: Number(viewerId) },
        select: { id: true, role: true, status: true },
      });
      const canView =
        viewer?.status === "ACTIVE" &&
        (viewer.role === "ADMIN" || viewer.id === property.ownerId);

      if (!canView) throw createError(404, "Property not found");
    }

    return property;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function updatePropertyStatusService(propertyId, ownerId, propertyStatus) {
  try {
    const parsedPropertyId = Number(propertyId);

    if (!Number.isInteger(parsedPropertyId) || parsedPropertyId < 1) {
      throw createError(400, "Invalid property ID");
    }

    const property = await prisma.property.findFirst({
      where: {
        id: parsedPropertyId,
        deletedAt: null,
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
        propertyStatus,
      },
    });
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function updatePropertyService(propertyId, ownerId, body) {
  try {
    const parsedPropertyId = Number(propertyId);

    if (!Number.isInteger(parsedPropertyId) || parsedPropertyId < 1) {
      throw createError(400, "Invalid property ID");
    }

    const property = await prisma.property.findFirst({
      where: {
        id: parsedPropertyId,
        deletedAt: null,
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

    const property = await prisma.property.findFirst({
      where: {
        id: parsedPropertyId,
        deletedAt: null,
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

    return await prisma.$transaction(async (tx) => {
      const address = await tx.propertyAddress.update({
        where: { propertyId: parsedPropertyId },
        data: body,
      });
      await tx.property.update({
        where: { id: parsedPropertyId },
        data: { publishStatus: "PENDING", rejectReason: null },
      });
      return address;
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

    const property = await prisma.property.findFirst({
      where: {
        id: parsedPropertyId,
        deletedAt: null,
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

    return await prisma.$transaction(async (tx) => {
      const address = await tx.propertyAddress.create({
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
      await tx.property.update({
        where: { id: parsedPropertyId },
        data: { publishStatus: "PENDING", rejectReason: null },
      });
      return address;
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
    const property = await prisma.property.findFirst({
      where: {
        id: Number(propertyId),
        deletedAt: null,
        publishStatus: "APPROVED",
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
    const property = await prisma.property.findFirst({
      where: {
        id: Number(propertyId),
        deletedAt: null,
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
