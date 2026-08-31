import { z } from "zod";
import { UserStatus } from "../../generated/prisma/client.js";

export const registerSchema = z
  .object({
    username: z.string().min(3, "username must be at least 3 characters"),

    email: z.string().email("invalid email"),

    password: z.string().min(6, "password must be at least 6 characters"),

    confirmPassword: z.string().min(6, "confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "confirmPassword must match password",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("invalid email"),

  password: z.string().min(1, "password is required"),
});

export const updateUserStatusSchema = z
  .object({
    status: z.enum(UserStatus),
  })
  .strict();
export const updateProfileSchema = z
  .object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    profileImageUrl: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
    birthdate: z
      .union([
        z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`)),
        z.null(),
      ])
      .optional(),
    occupation: z.string().nullable().optional(),
    currentAddress: z.string().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one profile field is required",
  });

export const communityPostSchema = z.object({
  propertyId: z.number().min(1, "propertyId must be at least 1"),

  title: z.string().min(6, "title must be at least 6 characters"),

  description: z.string(),

  requiredMembers: z.number().min(1, "requiredMembers must be at least 1"),

  status: z.string().optional(),
});

export const registerRoomSchema = z.object({
  roomName: z.string().min(1, "roomName is required").trim(),
  description: z.string().min(1, "description is required").trim(),
  monthlyRent: z.number().optional(),
  status: z.any().optional(),
  capacity: z.number().optional(),
});
