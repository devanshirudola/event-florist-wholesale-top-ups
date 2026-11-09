import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { authenticateUser } from "../services/authService";
import { env } from "../config/env";
import { sessionCookieOptions } from "../config/session";
import { loginSchema } from "../validators/schemas";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { sendData } from "../utils/response";

export const login = asyncHandler(async (request: Request, response: Response) => {
  const input = loginSchema.parse(request.body);
  const user = await authenticateUser(input.email, input.password);
  await new Promise<void>((resolve, reject) => {
    request.session.regenerate((error) => error ? reject(error) : resolve());
  });
  request.session.userId = user.id;
  await new Promise<void>((resolve, reject) => {
    request.session.save((error) => error ? reject(error) : resolve());
  });
  sendData(response, {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

export const logout = asyncHandler(async (request, response) => {
  await new Promise<void>((resolve, reject) => {
    request.session.destroy((error) => error ? reject(error) : resolve());
  });
  response.clearCookie("event-florist.sid", sessionCookieOptions);
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
  try {
    await User.create({ name, email: email.toLowerCase(), passwordHash, role: "Administrator" });
  } catch (error) {
    // Two instances starting at the same time can both pass the check above;
    // the unique email index decides the winner, and the loser must not abort.
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return false;
    throw error;
  }
  return true;
};
