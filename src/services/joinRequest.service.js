import { prisma } from "../lib/prisma.js";
import createError from "http-errors";

export async function updateJoinRequestService(requestId, action, userId) {
  try {
    if (!["ACCEPT", "REJECT"].includes(action)) {
      throw createError(400, "Invalid action");
    }

    // 1. ค้นหา joinRequest
    const joinRequest = await prisma.joinRequest.findUnique({
      where: {
        id: Number(requestId),
      },
      include: {
        communityPost: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!joinRequest) {
      throw createError(400, "Join request not found");
    }

    // 2. ตรวจสอบว่าเป็นเจ้าของ Community Post หรือไม่
    if (joinRequest.communityPost.creatorId !== Number(userId)) {
      throw createError(403, "You are not the owner of this community post");
    }

    // 3. ต้องเป็นคำขอที่ PENDING เท่านั้น
    if (joinRequest.status !== "PENDING") {
      throw createError(
        400,
        `This request has already been ${joinRequest.status.toLowerCase()}`,
      );
    }
    if (action === "REJECT") {
      const updatedRequest = await prisma.joinRequest.update({
        where: {
          id: Number(requestId),
        },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          communityPost: {
            select: {
              id: true,
              title: true,
              creatorId: true,
            },
          },
        },
      });

      return updatedRequest;
    }

    return await prisma.$transaction(async (tx) => {
      // 4. ตรวจสอบจำนวนสมาชิกปัจจุบัน
      const memberCount = await tx.communityMember.count({
        where: {
          communityPostId: joinRequest.communityPostId,
        },
      });

      // 5. ตรวจสอบว่ากลุ่มเต็มหรือยัง
      if (memberCount >= joinRequest.communityPost.requiredMembers) {
        throw createError(400, "This community group is already full");
      }

      // 6. ตรวจสอบว่าผู้สมัครเป็นสมาชิกอยู่แล้วหรือไม่
      const existingMember = await tx.communityMember.findUnique({
        where: {
          communityPostId_userId: {
            communityPostId: joinRequest.communityPostId,
            userId: joinRequest.userId,
          },
        },
      });

      if (existingMember) {
        throw createError(400, "User is already a member of this group");
      }

      // 7. เปลี่ยนสถานะ JoinRequest เป็น ACCEPTED
      await tx.joinRequest.update({
        where: {
          id: Number(requestId),
        },
        data: {
          status: "ACCEPTED",
          reviewedAt: new Date(),
        },
      });

      // 8. เพิ่ม User เข้า CommunityMember
      await tx.communityMember.create({
        data: {
          communityPostId: joinRequest.communityPostId,
          userId: joinRequest.userId,
          memberRole: "MEMBER",
        },
      });

      // 9. นับสมาชิกหลังจากเพิ่มสมาชิก
      const newMemberCount = memberCount + 1;

      // 10. ถ้าครบจำนวน requiredMembers ให้เปลี่ยน Post เป็น FULL
      if (newMemberCount >= joinRequest.communityPost.requiredMembers) {
        await tx.communityPost.update({
          where: {
            id: joinRequest.communityPostId,
          },
          data: {
            status: "FULL",
          },
        });
      }

      // 11. ส่งข้อมูลกลับ
      return await tx.joinRequest.findUnique({
        where: {
          id: Number(requestId),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          communityPost: {
            select: {
              id: true,
              title: true,
              creatorId: true,
              requiredMembers: true,
              status: true,
            },
          },
        },
      });
    });
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw createError(500, error.message);
  }
}
