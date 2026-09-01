import createError from "http-errors";
import { prisma } from "../lib/prisma.js";

const activeRentalStatuses = ["PENDING", "ACTIVE"];

const rentalListInclude = {
  property: {
    select: {
      id: true,
      title: true,
      rentType: true,
      propertyStatus: true,
      publishStatus: true,
      images: {
        where: { isCover: true },
        select: { id: true, imageUrl: true, isCover: true },
        take: 1,
      },
    },
  },
  room: {
    select: {
      id: true,
      roomName: true,
      monthlyRent: true,
      status: true,
      images: {
        where: { isCover: true },
        select: { id: true, imageUrl: true, isCover: true },
        take: 1,
      },
    },
  },
  owner: {
    select: { id: true, username: true, email: true },
  },
  members: {
    include: {
      user: {
        select: { id: true, username: true, email: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  },
};

export async function getMyRentalsService(userId, query) {
  const parsedUserId = Number(userId);
  const skip = (query.page - 1) * query.limit;
  const where = {
    ...(query.status ? { status: query.status } : {}),
    OR: [
      { ownerId: parsedUserId },
      { members: { some: { userId: parsedUserId } } },
    ],
  };

  try {
    const [rentals, total] = await prisma.$transaction([
      prisma.rental.findMany({
        where,
        include: rentalListInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.limit,
      }),
      prisma.rental.count({ where }),
    ]);

    return {
      rentals: rentals.map((rental) => ({
        ...rental,
        myRole: rental.ownerId === parsedUserId ? "OWNER" : "MEMBER",
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  } catch (error) {
    if (error.status) throw error;
    throw createError(500, error.message);
  }
}

export async function updateRentalStatusService(
  rentalId,
  actorId,
  actorRole,
  nextStatus
) {
  const parsedRentalId = Number(rentalId);
  const parsedActorId = Number(actorId);

  if (!Number.isInteger(parsedRentalId) || parsedRentalId < 1) {
    throw createError(400, "Invalid rental ID");
  }

  const allowedTransitions = {
    PENDING: ["ACTIVE", "CANCELLED"],
    ACTIVE: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };

  try {
    return await prisma.$transaction(
      async (tx) => {
        const rental = await tx.rental.findUnique({
          where: { id: parsedRentalId },
          include: { property: true, room: true },
        });

        if (!rental) throw createError(404, "Rental not found");
        if (actorRole !== "ADMIN" && rental.ownerId !== parsedActorId) {
          throw createError(403, "Only the rental owner or admin can update its status");
        }
        if (!allowedTransitions[rental.status].includes(nextStatus)) {
          throw createError(
            409,
            `Cannot change rental status from ${rental.status} to ${nextStatus}`
          );
        }

        if (nextStatus === "ACTIVE") {
          if (rental.property.deletedAt) {
            throw createError(409, "Cannot activate a rental for a deleted property");
          }
          if (rental.property.publishStatus !== "APPROVED") {
            throw createError(409, "Property must be approved before activating the rental");
          }

          if (rental.roomId) {
            if (!["AVAILABLE", "RESERVED"].includes(rental.room.status)) {
              throw createError(409, "Room is not available for this rental");
            }
            await tx.room.update({
              where: { id: rental.roomId },
              data: { status: "RENTED" },
            });
          } else {
            if (rental.property.propertyStatus !== "AVAILABLE") {
              throw createError(409, "Property is not available for this rental");
            }
            await tx.property.update({
              where: { id: rental.propertyId },
              data: { propertyStatus: "RENTED" },
            });
          }
        } else if (rental.roomId) {
          await tx.room.update({
            where: { id: rental.roomId },
            data: { status: "AVAILABLE" },
          });
        } else if (!rental.property.deletedAt) {
          await tx.property.update({
            where: { id: rental.propertyId },
            data: { propertyStatus: "AVAILABLE" },
          });
        }

        return tx.rental.update({
          where: { id: parsedRentalId },
          data: { status: nextStatus },
          include: rentalListInclude,
        });
      },
      { isolationLevel: "Serializable" }
    );
  } catch (error) {
    if (error.status) throw error;
    throw createError(500, error.message);
  }
}

export async function getRentalByIdService(rentalId, viewerId, viewerRole) {
  try {
    const parsedRentalId = Number(rentalId);
    const parsedViewerId = Number(viewerId);

    if (!Number.isInteger(parsedRentalId) || parsedRentalId < 1) {
      throw createError(400, "Invalid rental ID");
    }

    const rental = await prisma.rental.findFirst({
      where: {
        id: parsedRentalId,
        ...(viewerRole === "ADMIN" ? {} :
          {
            OR: [
              { ownerId: parsedViewerId },
              {
                members: {
                  some: { userId: parsedViewerId },
                },
              },
            ],
          }),
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            description: true,
            rentType: true,
            propertyType: true,
            propertyStatus: true,
            publishStatus: true,
            deletedAt: true,
            address: true,
            images: {
              select: {
                id: true,
                imageUrl: true,
                isCover: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        room: {
          include: {
            images: {
              select: {
                id: true,
                imageUrl: true,
                isCover: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                profileImageUrl: true,
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                    profileImageUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!rental) {
      throw createError(404, "Rental not found");
    }

    const myRole =
      viewerRole === "ADMIN"
        ? "ADMIN"
        : rental.ownerId === parsedViewerId
          ? "OWNER"
          : "MEMBER";

    return {
      ...rental,
      myRole,
    };
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}

export async function createRentalService(ownerId, body) {
  const parsedOwnerId = Number(ownerId);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const property = await tx.property.findFirst({
          where: {
            id: body.propertyId,
            deletedAt: null,
          },
          include: {
            rooms: body.roomId
              ? {
                where: { id: body.roomId },
              }
              : false,
          },
        });

        if (!property) {
          throw createError(404, "Property not found");
        }

        if (property.ownerId !== parsedOwnerId) {
          throw createError(403, "You are not the owner of this property");
        }

        if (property.publishStatus !== "APPROVED") {
          throw createError(409, "Property must be approved before creating a rental");
        }

        if (property.propertyStatus !== "AVAILABLE") {
          throw createError(409, "Property is not available for rent");
        }

        if (property.availableDate && body.startDate < property.availableDate) {
          throw createError(400, "startDate is earlier than the property availableDate");
        }

        let room = null;
        if (property.rentType === "INDIVIDUAL_ROOM") {
          if (!body.roomId) {
            throw createError(400, "roomId is required for an individual-room rental");
          }

          room = property.rooms[0];
          if (!room) {
            throw createError(404, "Room not found in this property");
          }
          if (room.status !== "AVAILABLE") {
            throw createError(409, "Room is not available for rent");
          }
          if (room.capacity && body.memberIds.length > room.capacity) {
            throw createError(400, `Room capacity is limited to ${room.capacity} member(s)`);
          }
        } else if (body.roomId) {
          console.log('body.roomId', body.roomId)
          throw createError(400, "roomId is not allowed for a whole-unit rental");
        }

        if (body.memberIds.includes(parsedOwnerId)) {
          throw createError(400, "The property owner cannot be a rental member");
        }

        const activeMembers = await tx.user.findMany({
          where: {
            id: { in: body.memberIds },
            status: "ACTIVE",
          },
          select: { id: true },
        });

        if (activeMembers.length !== body.memberIds.length) {
          throw createError(400, "One or more rental members do not exist or are not active");
        }

        const conflictingRental = await tx.rental.findFirst({
          where: {
            propertyId: property.id,
            status: { in: activeRentalStatuses },
            ...(property.rentType === "INDIVIDUAL_ROOM"
              ? {
                OR: [
                  { roomId: room.id },
                  { roomId: null },
                ],
              }
              : {}),
          },
          select: { id: true },
        });

        if (conflictingRental) {
          throw createError(409, "This property or room already has a pending or active rental");
        }

        const rental = await tx.rental.create({
          data: {
            propertyId: property.id,
            roomId: room?.id,
            ownerId: parsedOwnerId,
            startDate: body.startDate,
            endDate: body.endDate,
            monthlyRent: room?.monthlyRent ?? property.monthlyRent,
            members: {
              create: body.memberIds.map((userId) => ({ userId })),
            },
          },
          include: {
            property: {
              select: {
                id: true,
                title: true,
                rentType: true,
              },
            },
            room: true,
            owner: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    profile: true,
                  },
                },
              },
            },
          },
        });

        if (room) {
          await tx.room.update({
            where: { id: room.id },
            data: { status: "RESERVED" },
          });
        }

        return rental;
      },
      { isolationLevel: "Serializable" }
    );
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}
