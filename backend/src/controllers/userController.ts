import type { Request, Response } from "express";
import User from "../models/User";
import { createStaffUser } from "../services/authService";
import { createUserSchema } from "../validators/schemas";
import { asyncHandler } from "../utils/asyncHandler";
import { sendData, sendPage } from "../utils/response";
import { ApiError } from "../utils/ApiError";

export const listUsers = asyncHandler(async (request: Request, response: Response) => {
  const query = request.pageQuery!;
  const filter = query.search ? {
    $or: [
      { name: new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { email: new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
    ],
  } : {};
  const [users, total] = await Promise.all([
    User.find(filter).select("name email role isActive createdAt").sort({ name: 1 })
      .skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    User.countDocuments(filter),
  ]);
  sendPage(response, users, query.page, query.limit, total);
});

export const createUser = asyncHandler(async (request: Request, response: Response) => {
  const input = createUserSchema.parse(request.body);
  const existing = await User.exists({ email: input.email.toLowerCase() });
  if (existing) throw new ApiError(409, "EMAIL_IN_USE", "An account with this email already exists");
  const user = await createStaffUser(input);
  sendData(response, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  }, 201);
});
