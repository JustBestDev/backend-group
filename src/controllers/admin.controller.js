import createError from "http-errors";
import { prisma } from "../lib/prisma.js";
import { updateUserStatusSchema } from "../validations/schema.js";
import {
  findAllUsers,
  findAdminUserById,
  updateUserStatus,
} from "../services/admin.service.js";
import { createOwnerDocumentSignedUrl } from "../utils/uploadCloudOwnerApplication.js";

// ========================================
// GET /api/admin/users
// Get all users
// ========================================
export const getUsers = async (req, res, next) => {
  try {
    const users = await findAllUsers();

    return res.status(200).json({
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PATCH /api/admin/users/:userId/status
// Update a user's status
// ========================================
export const changeUserStatus = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return next(createError(400, "Invalid user ID"));
    }

    const { status } = updateUserStatusSchema.parse(req.body);
    const user = await findAdminUserById(userId);

    if (!user) {
      return next(createError(404, "User not found"));
    }

    const updatedUser = await updateUserStatus(userId, status);

    return res.status(200).json({
      message: "User status updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// GET /api/admin/dashboard
// ดูข้อมูลสรุปหน้า Admin Dashboard
// ========================================
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

      prisma.property.count({ where: { deletedAt: null } }),

      prisma.property.count({
        where: {
          publishStatus: "PENDING",
          deletedAt: null,
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
      message: "Admin dashboard retrieved successfully",
      data: {
        totalUsers,
        activeUsers,
        totalProperties,
        pendingProperties,
        pendingOwnerApplications,
        activeRentals,
        openCommunityPosts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// GET /api/admin/owner-applications
// ดูคำขอสมัคร Owner ทั้งหมด
// Query ที่ใช้ได้: ?status=PENDING
// ========================================
export const getOwnerApplications = async (req, res, next) => {
  try {
    const { status } = req.query;

    const allowedStatuses = ["PENDING", "NEED_MORE_DOCUMENTS", "APPROVED", "REJECTED"];

    if (status && !allowedStatuses.includes(status)) {
      return next(createError(400, "Invalid application status"));
    }

    const applications = await prisma.ownerApplication.findMany({
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
            status: true,
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

        reviewedBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Owner applications retrieved successfully",
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// GET /api/admin/owner-applications/:applicationId
// ดูรายละเอียดคำขอสมัคร Owner
// ========================================
export const getOwnerApplicationById = async (req, res, next) => {
  try {
    const applicationId = Number(req.params.applicationId);

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return next(createError(400, "Invalid application ID"));
    }

    const application = await prisma.ownerApplication.findUnique({
      where: {
        id: applicationId,
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
            email: true,
          },
        },
        documents: {
          select: {
            id: true,
            cloudinaryPublicId: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
    });

    if (!application) {
      return next(createError(404, "Owner application not found"));
    }

    application.documents = application.documents.map((document) => ({
      id: document.id,
      createdAt: document.createdAt,
      signedUrl: document.cloudinaryPublicId
        ? createOwnerDocumentSignedUrl(document.cloudinaryPublicId)
        : null,
    }));

    return res.status(200).json({
      message: "Owner application retrieved successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PATCH /api/admin/owner-applications/:applicationId
// Admin อนุมัติหรือปฏิเสธคำขอ Owner
//
// Body ตอนอนุมัติ:
// { "status": "APPROVED" }
//
// Body ตอนปฏิเสธ:
// {
//   "status": "REJECTED",
//   "rejectReason": "Document is unclear"
// }
// ========================================
export const reviewOwnerApplication = async (req, res, next) => {
  try {
    const applicationId = Number(req.params.applicationId);
    const adminId = req.user.id;
    const { status, rejectReason } = req.body;

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return next(createError(400, "Invalid application ID"));
    }

    if (!["APPROVED", "REJECTED", "NEED_MORE_DOCUMENTS"].includes(status)) {
      return next(
        createError(400, "Status must be APPROVED, REJECTED, or NEED_MORE_DOCUMENTS")
      );
    }

    if (
      ["REJECTED", "NEED_MORE_DOCUMENTS"].includes(status) &&
      (!rejectReason || !rejectReason.trim())
    ) {
      return next(
        createError(400, "An admin message is required")
      );
    }

    const application = await prisma.ownerApplication.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        user: true,
      },
    });

    if (!application) {
      return next(createError(404, "Owner application not found"));
    }

    if (application.status !== "PENDING") {
      return next(
        createError(409, "This application has already been reviewed")
      );
    }

    if (application.user.status !== "ACTIVE") {
      return next(
        createError(409, "Applicant account is not active")
      );
    }

    const updatedApplication = await prisma.$transaction(
      async (transaction) => {
        const updated = await transaction.ownerApplication.update({
          where: {
            id: applicationId,
          },
          data: {
            status,
            reviewedById: adminId,
            reviewedAt: new Date(),
            rejectReason:
              ["REJECTED", "NEED_MORE_DOCUMENTS"].includes(status)
                ? rejectReason.trim()
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
              },
            },
            reviewedBy: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        });

        if (status === "APPROVED") {
          await transaction.user.update({
            where: {
              id: application.userId,
            },
            data: {
              role: "OWNER",
            },
          });

          await transaction.profile.updateMany({
            where: {
              userId: application.userId,
            },
            data: {
              isVerified: true,
            },
          });
        }

        return updated;
      }
    );

    return res.status(200).json({
      message:
        status === "APPROVED"
          ? "Owner application approved successfully"
          : status === "NEED_MORE_DOCUMENTS"
            ? "Additional owner documents requested successfully"
            : "Owner application rejected successfully",
      data: updatedApplication,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// GET /api/admin/properties
// ดูประกาศทั้งหมด
// Query ที่ใช้ได้: ?publishStatus=PENDING
// ========================================
export const getAdminProperties = async (req, res, next) => {
  try {
    const { publishStatus } = req.query;

    const allowedStatuses = [
      "PENDING",
      "APPROVED",
      "REJECTED",
    ];

    if (
      publishStatus &&
      !allowedStatuses.includes(publishStatus)
    ) {
      return next(createError(400, "Invalid publish status"));
    }

    const properties = await prisma.property.findMany({
      where: {
        deletedAt: null,
        ...(publishStatus ? { publishStatus } : {}),
      },

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
                isVerified: true,
              },
            },
          },
        },

        address: true,

        images: {
          orderBy: {
            createdAt: "asc",
          },
        },

        rooms: true,

        _count: {
          select: {
            communityPosts: true,
            conversations: true,
            rentals: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Properties retrieved successfully",
      data: properties,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// GET /api/admin/properties/:propertyId
// ดูรายละเอียดประกาศหนึ่งรายการ
// ========================================
export const getAdminPropertyById = async (req, res, next) => {
  try {
    const propertyId = Number(req.params.propertyId);

    if (!Number.isInteger(propertyId) || propertyId <= 0) {
      return next(createError(400, "Invalid property ID"));
    }

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        deletedAt: null,
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

        images: {
          orderBy: {
            createdAt: "asc",
          },
        },

        rooms: true,

        communityPosts: true,

        _count: {
          select: {
            conversations: true,
            rentals: true,
          },
        },
      },
    });

    if (!property) {
      return next(createError(404, "Property not found"));
    }

    return res.status(200).json({
      message: "Property retrieved successfully",
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PATCH /api/admin/properties/:propertyId/publish-status
// Admin อนุมัติหรือปฏิเสธประกาศ
//
// Body ตอนอนุมัติ:
// { "publishStatus": "APPROVED" }
//
// Body ตอนปฏิเสธ:
// {
//   "publishStatus": "REJECTED",
//   "rejectReason": "Property information is incomplete"
// }
// ========================================
export const reviewProperty = async (req, res, next) => {
  try {
    const propertyId = Number(req.params.propertyId);
    const { publishStatus, rejectReason } = req.body;

    if (!Number.isInteger(propertyId) || propertyId <= 0) {
      return next(createError(400, "Invalid property ID"));
    }

    if (!["APPROVED", "REJECTED"].includes(publishStatus)) {
      return next(
        createError(
          400,
          "Publish status must be APPROVED or REJECTED"
        )
      );
    }

    if (
      publishStatus === "REJECTED" &&
      (!rejectReason || !rejectReason.trim())
    ) {
      return next(
        createError(400, "Reject reason is required")
      );
    }

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        deletedAt: null,
      },
      include: {
        owner: {
          select: {
            id: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!property) {
      return next(createError(404, "Property not found"));
    }

    if (property.publishStatus !== "PENDING") {
      return next(
        createError(409, "This property has already been reviewed")
      );
    }

    if (property.owner.status !== "ACTIVE") {
      return next(
        createError(409, "Property owner account is not active")
      );
    }

    if (property.owner.role !== "OWNER") {
      return next(
        createError(409, "Property owner has not been approved")
      );
    }

    const updatedProperty = await prisma.property.update({
      where: {
        id: propertyId,
      },
      data: {
        publishStatus,
        rejectReason:
          publishStatus === "REJECTED"
            ? rejectReason.trim()
            : null,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        address: true,
        images: true,
        rooms: true,
      },
    });

    return res.status(200).json({
      message:
        publishStatus === "APPROVED"
          ? "Property approved successfully"
          : "Property rejected successfully",
      data: updatedProperty,
    });
  } catch (error) {
    next(error);
  }
};
