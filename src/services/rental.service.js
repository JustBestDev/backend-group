import createError from "http-errors";
import { prisma } from "../lib/prisma.js";

const activeRentalStatuses = ["PENDING", "ACTIVE"];

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
