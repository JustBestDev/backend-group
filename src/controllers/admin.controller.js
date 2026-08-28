import prisma from "../config/prisma.js";

// GET /api/admin/dashboard
export const getAdminDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalProperties,
      pendingProperties,
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

      prisma.property.count(),

      prisma.property.count({
        where: {
          publishStatus: "PENDING",
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

    return res.status(200).json({
      totalUsers,
      activeUsers,
      totalProperties,
      pendingProperties,
      pendingOwnerApplications,
      activeRentals,
      openCommunityPosts,
    });
  } catch (error) {
    next(error);
  }
};