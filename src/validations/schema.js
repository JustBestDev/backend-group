import { z } from "zod"

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "username must be at least 3 characters"),

    email: z
      .string()
      .email("invalid email"),

    password: z
      .string()
      .min(6, "password must be at least 6 characters"),

    confirmPassword: z
      .string()
      .min(6, "confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "confirmPassword must match password",
    path: ["confirmPassword"],
  })