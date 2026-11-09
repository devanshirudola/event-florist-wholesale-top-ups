import type { RequestHandler } from "express";
import User from "../models/User";
import type { UserRole } from "../types";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

export const requireAuth: RequestHandler = asyncHandler(async (request, _response) => {
  const userId = request.session.userId;
  if (!userId) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue");

  const user = await User.findById(userId).select("name email role isActive");
  if (!user || !user.isActive) {
    request.session.destroy((error) => {
      if (error) console.error("Failed to clear an inactive user session", error);
    });
    throw new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue");
  }

  request.authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
  };
});

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.authUser) {
      next(new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue"));
      return;
    }
    if (!roles.includes(request.authUser.role)) {
      next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}
