import bcrypt from "bcrypt";
import createError from "http-errors";

import {
  loginSchema,
  registerSchema,
} from "../validations/schema.js";

import { createTokenUser } from "../utils/jwt.js";

import {
  createUser,
  findUserByEmail,
  findUserByUsername,
} from "../services/auth.service.js";

export const register = async (req, res, next) => {
  try {
    // ใช้ข้อมูลที่ผ่าน Zod Validation แล้ว
    const {
      username,
      email,
      password,
    } = registerSchema.parse(req.body);

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const normalizedUsername = username.trim();

    const emailExist = await findUserByEmail(
      normalizedEmail
    );

    if (emailExist) {
      return next(
        createError(409, "Email already exists")
      );
    }

    const usernameExist = await findUserByUsername(
      normalizedUsername
    );

    if (usernameExist) {
      return next(
        createError(409, "Username already exists")
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const newUser = await createUser(
      normalizedUsername,
      normalizedEmail,
      hashedPassword
    );

    return res.status(201).json({
      message: "Registered successfully",

      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    // ใช้ข้อมูลที่ผ่าน Zod Validation แล้ว
    const {
      email,
      password,
    } = loginSchema.parse(req.body);

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const user = await findUserByEmail(
      normalizedEmail
    );

    if (!user) {
      return next(
        createError(
          401,
          "Invalid email or password"
        )
      );
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordMatch) {
      return next(
        createError(
          401,
          "Invalid email or password"
        )
      );
    }

    if (user.status === "SUSPENDED") {
      return next(
        createError(
          403,
          "Your account has been suspended"
        )
      );
    }

    if (user.status === "BANNED") {
      return next(
        createError(
          403,
          "Your account has been banned"
        )
      );
    }

    const token = await createTokenUser(user);

    return res.status(200).json({
      message: "Logged in successfully",
      token,

      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};