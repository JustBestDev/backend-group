import bcrypt from "bcrypt";
import createError from "http-errors";
import { loginSchema, registerSchema } from "../validations/schema.js";
import { createTokenUser } from "../utils/jwt.js";
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
} from "../services/auth.service.js";

export const register = async (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;

  const data = registerSchema.parse(req.body)

  const emailExist = await findUserByEmail(email);

  if (emailExist) {
    return next(createError(400, "Email  already exits"));
  }

  const usernameExist = await findUserByUsername(username);

  if (usernameExist) {
    return next(createError(400, "Username already exits"));
  }

  const hashPassword = await bcrypt.hash(password, 8);

  const newUser = await createUser(username, email, hashPassword);

  res.status(201).json({
    message: "Register successfully",
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    },
  });
};

export const login = async (req, res, next) => {
    const { email, password } = req.body

    const data = loginSchema.parse(req.body)

    const user = await findUserByEmail(email)

    if (!user) {
        return next(createError(401, "Invalid credentials"))
    }
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        return next(createError(401, "Invalid credentials"))
    }

    const token = await createTokenUser(user)
    // console.log('token', token)
    res.status(200).json({
        message: "Login successfully",
        token: token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
        }
    })
}
