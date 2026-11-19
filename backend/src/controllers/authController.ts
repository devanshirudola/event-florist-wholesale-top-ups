import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { authenticateUser } from "../services/authService";
import { env } from "../config/env";
import { loginSchema, registerSchema } from "../validators/schemas";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { sendData } from "../utils/response";
import { createStaffUser } from "../services/authService";

async function startSession(request: Request, userId: string) {
  await new Promise<void>((resolve, reject) => {
    request.session.regenerate((error) => error ? reject(error) : resolve());
  });
  request.session.userId = userId;
  await new Promise<void>((resolve, reject) => {
    request.session.save((error) => error ? reject(error) : resolve());
  });
}

function publicUser(user: { id: string; name: string; email: string; role: string }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export const login = asyncHandler(async (request: Request, response: Response) => {
  const input = loginSchema.parse(request.body);
  const user = await authenticateUser(input.email, input.password);
  await startSession(request, user.id);
  sendData(response, { user: publicUser(user) });
});

export const register = asyncHandler(async (request: Request, response: Response) => {
  const input = registerSchema.parse(request.body);
  if (await User.exists({ email: input.email.toLowerCase() })) {
    throw new ApiError(409, "EMAIL_IN_USE", "An account with this email already exists");
  }

  let user;
  try {
    user = await createStaffUser(input);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new ApiError(409, "EMAIL_IN_USE", "An account with this email already exists");
    }
    throw error;
  }

  await startSession(request, user.id);
  sendData(response, { user: publicUser(user) }, 201);
});

export const logout = asyncHandler(async (request, response) => {
  await new Promise<void>((resolve, reject) => {
    request.session.destroy((error) => error ? reject(error) : resolve());
  });
  response.clearCookie("event-florist.sid", {
    httpOnly: true,
    sameSite: env.SESSION_COOKIE_SAMESITE ?? (env.NODE_ENV === "production" ? "none" : "strict"),
    secure: env.NODE_ENV === "production",
  });
  sendData(response, { message: "Signed out" });
});

export const me = asyncHandler(async (request, response) => {
  const user = request.authUser;
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue");
  sendData(response, { user });
});

export const createFirstAdmin = async () => {
  const email = env.ADMIN_EMAIL;
  const name = env.ADMIN_NAME;
  const password = env.ADMIN_PASSWORD;
  if (!email || !name || !password) return false;
  const existing = await User.findOne({ role: "Administrator" });
  if (existing) return false;
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name, email: email.toLowerCase(), passwordHash, role: "Administrator" });
  return true;
};
