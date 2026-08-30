import { prisma } from "../lib/prisma.js";

// ==============================
// PROPERTY
// ==============================

export const findPropertyById = async (
  propertyId
) => {
  const property =
    await prisma.property.findUnique({
      where: {
        id: Number(propertyId),
      },

      select: {
        id: true,
        ownerId: true,
        title: true,
        publishStatus: true,
        propertyStatus: true,
      },
    });

  return property;
};

// ==============================
// USER
// ==============================

export const findConversationUserById = async (
  userId
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: Number(userId),
    },

    select: {
      id: true,
      username: true,
      role: true,
      status: true,
    },
  });

  return user;
};

// ==============================
// CONVERSATION
// ==============================

// ตรวจว่า User สองคนมี Conversation
// ของ Property นี้อยู่แล้วหรือไม่
export const findExistingConversation = async (
  propertyId,
  firstUserId,
  secondUserId
) => {
  const conversation =
    await prisma.conversation.findFirst({
      where: {
        propertyId: Number(propertyId),

        AND: [
          {
            members: {
              some: {
                userId: Number(firstUserId),
              },
            },
          },
          {
            members: {
              some: {
                userId: Number(secondUserId),
              },
            },
          },
        ],
      },

      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                role: true,
                status: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    profileImageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

  return conversation;
};

// สร้าง Conversation และเพิ่มสมาชิกสองคน
export const createConversation = async (
  propertyId,
  firstUserId,
  secondUserId
) => {
  const conversation =
    await prisma.conversation.create({
      data: {
        propertyId: Number(propertyId),

        members: {
          create: [
            {
              userId: Number(firstUserId),
            },
            {
              userId: Number(secondUserId),
            },
          ],
        },
      },

      include: {
        property: {
          select: {
            id: true,
            title: true,
            monthlyRent: true,
          },
        },

        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                role: true,
                status: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    profileImageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

  return conversation;
};

// ดู Conversation ทั้งหมดของ User
export const findConversationsByUserId = async (
  userId
) => {
  const conversations =
    await prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId: Number(userId),
          },
        },
      },

      include: {
        property: {
          select: {
            id: true,
            title: true,
            monthlyRent: true,

            images: {
              where: {
                isCover: true,
              },

              select: {
                id: true,
                imageUrl: true,
              },

              take: 1,
            },
          },
        },

        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                role: true,

                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    profileImageUrl: true,
                  },
                },
              },
            },
          },
        },

        messages: {
          orderBy: {
            createdAt: "desc",
          },

          take: 1,

          select: {
            id: true,
            message: true,
            senderId: true,
            isRead: true,
            createdAt: true,
          },
        },
      },

      orderBy: {
        updatedAt: "desc",
      },
    });

  return conversations;
};

// ดู Conversation รายการเดียวและตรวจว่า User เป็นสมาชิกด้วย
export const findConversationByIdAndUserId =
  async (conversationId, userId) => {
    const conversation =
      await prisma.conversation.findFirst({
        where: {
          id: Number(conversationId),

          members: {
            some: {
              userId: Number(userId),
            },
          },
        },

        include: {
          property: {
            select: {
              id: true,
              title: true,
              monthlyRent: true,

              images: {
                where: {
                  isCover: true,
                },

                select: {
                  id: true,
                  imageUrl: true,
                },

                take: 1,
              },
            },
          },

          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  role: true,

                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      profileImageUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    return conversation;
  };

// ==============================
// CONVERSATION MEMBER
// ==============================

export const findConversationMember = async (
  conversationId,
  userId
) => {
  const member =
    await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId: Number(userId),
        },
      },
    });

  return member;
};

// ==============================
// MESSAGE
// ==============================

export const findMessagesByConversationId =
  async (
    conversationId,
    page = 1,
    limit = 20
  ) => {
    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: {
        conversationId: Number(conversationId),
      },

      include: {
        sender: {
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
      },

      orderBy: {
        createdAt: "desc",
      },

      skip,
      take: limit,
    });

    return messages;
  };

export const countConversationMessages = async (
  conversationId
) => {
  const total = await prisma.message.count({
    where: {
      conversationId: Number(conversationId),
    },
  });

  return total;
};

// สร้าง Message และอัปเดต updatedAt
// ของ Conversation พร้อมกัน
export const createConversationMessage = async (
  conversationId,
  senderId,
  message
) => {
  const newMessage =
    await prisma.$transaction(async (tx) => {
      const createdMessage =
        await tx.message.create({
          data: {
            conversationId:
              Number(conversationId),

            senderId: Number(senderId),

            message: message.trim(),
          },

          include: {
            sender: {
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
          },
        });

      await tx.conversation.update({
        where: {
          id: Number(conversationId),
        },

        data: {
          updatedAt: new Date(),
        },
      });

      return createdMessage;
    });

  return newMessage;
};

// Mark ข้อความของอีกฝ่ายว่าอ่านแล้ว
export const markMessagesAsRead = async (
  conversationId,
  currentUserId
) => {
  const result = await prisma.message.updateMany({
    where: {
      conversationId: Number(conversationId),

      senderId: {
        not: Number(currentUserId),
      },

      isRead: false,
    },

    data: {
      isRead: true,
    },
  });

  return result;
};