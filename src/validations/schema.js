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

export const updateJoinRequestSchema = z
  .object({
    action: z.enum(["ACCEPT", "REJECT"]),
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

export const updateCommunityPostSchema = communityPostSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one community post field is required",
  });

export const registerRoomSchema = z.object({
  roomName: z.string().min(1, "roomName is required").trim(),
  description: z.string().min(1, "description is required").trim().optional(),
  monthlyRent: z.coerce.number().nonnegative(),
  status: z.enum(["AVAILABLE", "RESERVED", "RENTED"]).optional(),
  capacity: z.coerce.number().int().positive().optional(),
}).strict();

export const createPropertySchema = z
  .object({
    title: z.string().trim().min(1, "title is required"),
    description: z.string().trim().min(1, "description is required"),
    propertyType: z.enum([
      "HOUSE",
      "CONDO",
      "APARTMENT",
      "DORMITORY",
      "OTHER",
    ]),
    rentType: z.enum(["INDIVIDUAL_ROOM", "WHOLE_UNIT"]),
    monthlyRent: z.coerce.number().nonnegative(),
    deposit: z.coerce.number().nonnegative().nullable().optional(),
    availableDate: z
      .union([z.iso.date(), z.iso.datetime()])
      .transform((value) => new Date(value))
      .nullable()
      .optional(),
    totalBedrooms: z.coerce.number().int().nonnegative().nullable().optional(),
  })
  .strict();

export const updatePropertySchema = createPropertySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one property field is required",
  });

export const updatePropertyStatusSchema = z
  .object({
    propertyStatus: z.enum(["AVAILABLE", "RENTED", "CLOSED"]),
  })
  .strict();

export const getPropertiesQuerySchema = z
  .object({
    q: z.string().trim().min(1).optional(),
    province: z.string().trim().min(1).optional(),
    propertyType: z
      .enum(["HOUSE", "CONDO", "APARTMENT", "DORMITORY", "OTHER"])
      .optional(),
    rentType: z.enum(["INDIVIDUAL_ROOM", "WHOLE_UNIT"]).optional(),
    propertyStatus: z.enum(["AVAILABLE", "RENTED", "CLOSED"]).optional(),
    minRent: z.coerce.number().nonnegative().optional(),
    maxRent: z.coerce.number().nonnegative().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict()
  .refine(
    (data) =>
      data.minRent === undefined ||
      data.maxRent === undefined ||
      data.minRent <= data.maxRent,
    {
      message: "minRent must be less than or equal to maxRent",
      path: ["minRent"],
    }
  );

export const createPropertyAddressSchema = z
  .object({
    province: z.string().trim().min(1, "province is required"),
    district: z.string().trim().nullable().optional(),
    subDistrict: z.string().trim().nullable().optional(),
    postcode: z.string().trim().nullable().optional(),
    road: z.string().trim().nullable().optional(),
    building: z.string().trim().nullable().optional(),
    latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
    longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  })
  .strict();

export const updatePropertyAddressSchema = createPropertyAddressSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one address field is required",
  });

const rentalDateSchema = z
  .union([z.iso.date(), z.iso.datetime()])
  .transform((value) => new Date(value));

export const createRentalSchema = z
  .object({
    propertyId: z.coerce.number().int().positive(),
    roomId: z.coerce.number().int().positive().nullable().optional(),
    memberIds: z
      .array(z.coerce.number().int().positive())
      .min(1, "At least one rental member is required")
      .max(20, "A rental cannot have more than 20 members")
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "memberIds must not contain duplicates",
      }),
    startDate: rentalDateSchema,
    endDate: rentalDateSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (data) => !data.endDate || data.endDate > data.startDate,
    {
      message: "endDate must be later than startDate",
      path: ["endDate"],
    }
  );

export const getMyRentalsQuerySchema = z
  .object({
    status: z.enum(["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();

export const updateRentalStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]),
  })
  .strict();
