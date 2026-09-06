import createError from "http-errors";
import { prisma } from "../lib/prisma.js";

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

export async function reviewRentalRequestService(requestId, ownerId, action) {
  const parsedRequestId = Number(requestId);
  const parsedOwnerId = Number(ownerId);

  if (!Number.isInteger(parsedRequestId) || parsedRequestId < 1) {
    throw createError(400, "Invalid rental request ID");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const rentalRequest = await tx.rentalRequest.findUnique({
        where: { id: parsedRequestId },
        select: {
          status: true,
          property: { select: { ownerId: true } },
        },
      });

      if (!rentalRequest) throw createError(404, "Rental request not found");
      if (rentalRequest.property.ownerId !== parsedOwnerId) {
        throw createError(403, "You can only review requests for your own properties");
      }
      if (rentalRequest.status !== "PENDING") {
        throw createError(409, `Cannot review a ${rentalRequest.status} rental request`);
      }

      const result = await tx.rentalRequest.updateMany({
        where: { id: parsedRequestId, status: "PENDING" },
        data: {
          status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED",
          reviewedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw createError(409, "Rental request has already been reviewed");
      }

      return tx.rentalRequest.findUnique({
        where: { id: parsedRequestId },
        include: rentalRequestInclude,
      });
    });
  } catch (error) {
    if (error.status) throw error;
    throw createError(500, error.message);
  }
}
