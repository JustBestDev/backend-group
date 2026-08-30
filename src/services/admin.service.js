import { prisma } from "../lib/prisma.js";

// ==============================
// ADMIN DASHBOARD
// ==============================

export const getDashboardStatistics =
  async () => {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      totalProperties,
      pendingProperties,
      approvedProperties,
      pendingOwnerApplications,
      activeRentals,
      openCommunityPosts,
    ] = await prisma.$transaction([
      prisma.user.count(),

      prisma.user.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.user.count({
        where: {
          status: "SUSPENDED",
        },
      }),

      prisma.user.count({
        where: {
          status: "BANNED",
        },
      }),

      prisma.property.count(),

      prisma.property.count({
        where: {
          publishStatus: "PENDING",
        },
      }),

      prisma.property.count({
        where: {
          publishStatus: "APPROVED",
        },
      }),

      prisma.ownerApplication.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.rental.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.communityPost.count({
        where: {
          status: "OPEN",
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      totalProperties,
      pendingProperties,
      approvedProperties,
      pendingOwnerApplications,
      activeRentals,
      openCommunityPosts,
    };
  };

// ==============================
// OWNER APPLICATION
// ==============================

export const findOwnerApplications = async (
  status
) => {
  const applications =
    await prisma.ownerApplication.findMany({
      where: status
        ? {
            status,
          }
        : undefined,

      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            status: true,

            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                profileImageUrl: true,
                isVerified: true,
              },
            },
          },
        },

        reviewedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  return applications;
};

export const findOwnerApplicationById = async (
  applicationId
) => {
  const application =
    await prisma.ownerApplication.findUnique({
      where: {
        id: Number(applicationId),
      },

      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            status: true,
            profile: true,
          },
        },

        reviewedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

  return application;
};

export const updateOwnerApplication = async (
  application,
  adminId,
  status,
  rejectReason
) => {
  const result = await prisma.$transaction(
    async (tx) => {
      const updatedApplication =
        await tx.ownerApplication.update({
          where: {
            id: application.id,
          },

          data: {
            status,

            reviewedById: Number(adminId),

            reviewedAt: new Date(),

            rejectReason:
              status === "REJECTED"
                ? rejectReason
                : null,
          },

          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                role: true,
                status: true,
                profile: true,
              },
            },

            reviewedBy: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        });

      /*
        ถ้า Approve:
        1. เปลี่ยน Role เป็น OWNER
        2. เปลี่ยน Profile เป็น Verified
      */
      if (status === "APPROVED") {
        await tx.user.update({
          where: {
            id: application.userId,
          },

          data: {
            role: "OWNER",
          },
        });

        /*
          ใช้ updateMany เพื่อไม่ให้ Transaction พัง
          หาก User ยังไม่มี Profile
        */
        await tx.profile.updateMany({
          where: {
            userId: application.userId,
          },

          data: {
            isVerified: true,
          },
        });
      }

      return updatedApplication;
    }
  );

  return result;
};

// ==============================
// PROPERTY APPROVAL
// ==============================

export const findAdminProperties = async (
  publishStatus
) => {
  const properties =
    await prisma.property.findMany({
      where: publishStatus
        ? {
            publishStatus,
          }
        : undefined,

      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            status: true,

            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                profileImageUrl: true,
                isVerified: true,
              },
            },
          },
        },

        address: true,
        rooms: true,

        images: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  return properties;
};

export const findAdminPropertyById = async (
  propertyId
) => {
  const property =
    await prisma.property.findUnique({
      where: {
        id: Number(propertyId),
      },

      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            status: true,
            profile: true,
          },
        },

        address: true,
        rooms: true,
        images: true,
      },
    });

  return property;
};

export const updatePropertyPublishStatus =
  async (
    propertyId,
    publishStatus,
    rejectReason
  ) => {
    const property =
      await prisma.property.update({
        where: {
          id: Number(propertyId),
        },

        data: {
          publishStatus,

          rejectReason:
            publishStatus === "REJECTED"
              ? rejectReason
              : null,
        },

        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },

          address: true,
          rooms: true,
          images: true,
        },
      });

    return property;
  };