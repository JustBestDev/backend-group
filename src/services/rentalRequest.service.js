import createError from "http-errors";
import { prisma } from "../lib/prisma.js";
import { activeRentalTargetWhere } from "./rental.service.js";

const rentalRequestInclude = {
  property: {
    select: {
      id: true,
      ownerId: true,
      title: true,
      rentType: true,
      propertyStatus: true,
      publishStatus: true,
    },
  },
  room: {
    select: { id: true, roomName: true, status: true },
  },
  requester: {
    select: { id: true, username: true },
  },
  communityPost: {
    select: { id: true, title: true, creatorId: true },
  },
};

export async function createRentalRequestService(requesterId, body) {
  const parsedRequesterId = Number(requesterId);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const property = await tx.property.findFirst({
          where: { id: body.propertyId, deletedAt: null },
          include: {
            rooms: body.roomId ? { where: { id: body.roomId } } : false,
          },
        });

        if (!property) throw createError(404, "Property not found");
        if (property.publishStatus !== "APPROVED") {
          throw createError(409, "Property is not approved for rental requests");
        }
        if (property.propertyStatus !== "AVAILABLE") {
          throw createError(409, "Property is not available for rent");
        }

        let room = null;
        if (property.rentType === "INDIVIDUAL_ROOM") {
          if (!body.roomId) {
            throw createError(400, "roomId is required for an individual-room request");
          }
          room = property.rooms[0];
          if (!room) throw createError(404, "Room not found in this property");
          if (room.status !== "AVAILABLE") {
            throw createError(409, "Room is not available for rent");
          }
        } else if (body.roomId) {
          throw createError(400, "roomId is not allowed for a whole-unit request");
        }

        const conflictingRental = await tx.rental.findFirst({
          where: activeRentalTargetWhere(
            property.id,
            property.rentType,
            room?.id,
          ),
          select: { id: true },
        });
        if (conflictingRental) {
          throw createError(
            409,
            "This property or room already has a pending or active rental",
          );
        }

        if (body.communityPostId) {
          const communityPost = await tx.communityPost.findUnique({
            where: { id: body.communityPostId },
            select: { creatorId: true, propertyId: true },
          });

          if (!communityPost) throw createError(404, "Community post not found");
          if (communityPost.creatorId !== parsedRequesterId) {
            throw createError(403, "Requester must be the community post creator");
          }
          if (communityPost.propertyId !== property.id) {
            throw createError(400, "Community post does not belong to this property");
          }
        }

        const duplicate = await tx.rentalRequest.findFirst({
          where: {
            requesterId: parsedRequesterId,
            propertyId: property.id,
            roomId: room?.id ?? null,
            status: "PENDING",
          },
          select: { id: true },
        });

        if (duplicate) {
          throw createError(409, "You already have a pending request for this rental target");
        }

        return tx.rentalRequest.create({
          data: {
            propertyId: property.id,
            roomId: room?.id ?? null,
            requesterId: parsedRequesterId,
            communityPostId: body.communityPostId ?? null,
            startDate: body.startDate,
            endDate: body.endDate,
          },
          include: rentalRequestInclude,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error.status) throw error;
    throw createError(500, error.message);
  }
}

export async function getMyRentalRequestsService(requesterId) {
  try {
    return await prisma.rentalRequest.findMany({
      where: { requesterId: Number(requesterId) },
      include: rentalRequestInclude,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (error.status) throw error;
    throw createError(500, error.message);
  }
}

export async function getOwnerRentalRequestsService(ownerId) {
  try {
    return await prisma.rentalRequest.findMany({
      where: { property: { ownerId: Number(ownerId) } },
      include: rentalRequestInclude,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (error.status) throw error;
    throw createError(500, error.message);
  }
}

export async function getOwnerUnreadRentalRequestCountService(ownerId) {
  return prisma.rentalRequest.count({
    where: {
      property: { ownerId: Number(ownerId) },
      ownerViewedAt: null,
      status: "PENDING",
    },
  });
}

export async function markOwnerRentalRequestsViewedService(ownerId) {
  return prisma.rentalRequest.updateMany({
    where: {
      property: { ownerId: Number(ownerId) },
      ownerViewedAt: null,
    },
    data: { ownerViewedAt: new Date() },
  });
}

export async function reviewRentalRequestService(
  requestId,
  ownerId,
  action,
  database = prisma,
) {
  const parsedRequestId = Number(requestId);
  const parsedOwnerId = Number(ownerId);

  if (!Number.isInteger(parsedRequestId) || parsedRequestId < 1) {
    throw createError(400, "Invalid rental request ID");
  }

  try {
    return await database.$transaction(async (tx) => {
      const rentalRequest = await tx.rentalRequest.findUnique({
        where: { id: parsedRequestId },
        include: {
          property: true,
          room: true,
          communityPost: {
            include: {
              members: { select: { userId: true } },
            },
          },
        },
      });

      if (!rentalRequest) throw createError(404, "Rental request not found");
      if (rentalRequest.property.ownerId !== parsedOwnerId) {
        throw createError(403, "You can only review requests for your own properties");
      }
      if (rentalRequest.status !== "PENDING") {
        throw createError(409, `Cannot review a ${rentalRequest.status} rental request`);
      }

      const reviewedAt = new Date();

      if (action === "REJECT") {
        const result = await tx.rentalRequest.updateMany({
          where: { id: parsedRequestId, status: "PENDING" },
          data: { status: "REJECTED", reviewedAt },
        });

        if (result.count === 0) {
          throw createError(409, "Rental request has already been reviewed");
        }

        return tx.rentalRequest.findUnique({
          where: { id: parsedRequestId },
          include: rentalRequestInclude,
        });
      }

      const { property, room, communityPost } = rentalRequest;

      if (property.deletedAt) throw createError(409, "Property has been deleted");
      if (property.publishStatus !== "APPROVED") {
        throw createError(409, "Property is not approved for rental");
      }
      if (property.propertyStatus !== "AVAILABLE") {
        throw createError(409, "Property is not available for rent");
      }
      if (property.availableDate && rentalRequest.startDate < property.availableDate) {
        throw createError(400, "startDate is earlier than the property availableDate");
      }

      if (property.rentType === "WHOLE_UNIT") {
        if (rentalRequest.roomId) {
          throw createError(400, "roomId is not allowed for a whole-unit rental");
        }
      } else {
        if (!rentalRequest.roomId || !room || room.propertyId !== property.id) {
          throw createError(400, "A room from this property is required");
        }
        if (room.status !== "AVAILABLE") {
          throw createError(409, "Room is not available for rent");
        }
      }

      let memberIds;
      if (!communityPost) {
        if (rentalRequest.communityPostId) {
          throw createError(409, "Community post no longer exists");
        }
        memberIds = [rentalRequest.requesterId];
      } else {
        if (communityPost.creatorId !== rentalRequest.requesterId) {
          throw createError(409, "Requester is no longer the community post creator");
        }
        if (communityPost.propertyId !== property.id) {
          throw createError(409, "Community post does not belong to this property");
        }

        const additionalMemberIds = [
          ...new Set(
            communityPost.members
              .map(({ userId }) => userId)
              .filter((userId) => userId !== communityPost.creatorId),
          ),
        ];
        if (
          communityPost.status !== "FULL" &&
          additionalMemberIds.length < communityPost.requiredMembers
        ) {
          throw createError(409, "Community group is not complete enough to rent");
        }
        memberIds = [communityPost.creatorId, ...additionalMemberIds];
      }

      memberIds = [...new Set(memberIds)];
      if (memberIds.includes(property.ownerId)) {
        throw createError(400, "The property owner cannot be a rental member");
      }
      if (memberIds.length > 20) {
        throw createError(400, "A rental cannot have more than 20 members");
      }
      if (room?.capacity && memberIds.length > room.capacity) {
        throw createError(400, `Room capacity is limited to ${room.capacity} member(s)`);
      }

      const activeMembers = await tx.user.findMany({
        where: { id: { in: memberIds }, status: "ACTIVE" },
        select: { id: true },
      });
      if (activeMembers.length !== memberIds.length) {
        throw createError(400, "One or more rental members do not exist or are not active");
      }

      const conflictingRental = await tx.rental.findFirst({
        where: activeRentalTargetWhere(
          property.id,
          property.rentType,
          room?.id,
        ),
        select: { id: true },
      });
      if (conflictingRental) {
        throw createError(409, "This property or room already has a pending or active rental");
      }

      const result = await tx.rentalRequest.updateMany({
        where: { id: parsedRequestId, status: "PENDING" },
        data: { status: "ACCEPTED", reviewedAt },
      });

      if (result.count === 0) {
        throw createError(409, "Rental request has already been reviewed");
      }

      if (room) {
        const reservation = await tx.room.updateMany({
          where: { id: room.id, status: "AVAILABLE" },
          data: { status: "RESERVED" },
        });
        if (reservation.count === 0) {
          throw createError(409, "Room is no longer available for rent");
        }
      }

      await tx.rental.create({
        data: {
          propertyId: property.id,
          roomId: room?.id ?? null,
          ownerId: property.ownerId,
          startDate: rentalRequest.startDate,
          endDate: rentalRequest.endDate,
          monthlyRent: room?.monthlyRent ?? property.monthlyRent,
          members: {
            create: memberIds.map((userId) => ({ userId })),
          },
        },
      });

      await tx.rentalRequest.updateMany({
        where: {
          id: { not: parsedRequestId },
          propertyId: property.id,
          roomId: room?.id ?? null,
          status: "PENDING",
        },
        data: { status: "REJECTED", reviewedAt },
      });

      return tx.rentalRequest.findUnique({
        where: { id: parsedRequestId },
        include: rentalRequestInclude,
      });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error.status) throw error;
    if (error.code === "P2034") {
      throw createError(409, "Rental target was accepted by another request");
    }
    throw createError(500, error.message);
  }
}
