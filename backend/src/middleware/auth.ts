import type { RequestHandler } from "express";
import User from "../models/User";
import { sessionCookieOptions } from "../config/session";
import type { UserRole } from "../types";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

function destroySession(request: Parameters<RequestHandler>[0]): Promise<void> {
  return new Promise((resolve) => {
    request.session.destroy(() => resolve());
  });
}

export const requireAuth: RequestHandler = asyncHandler(async (request, response, next) => {
  const userId = request.session.userId;
  if (!userId) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue");

  const user = await User.findById(userId).select("name email role isActive").catch(() => null);
  if (!user || !user.isActive) {
    // The stored session is unusable: revoke it fully and drop the cookie so
    // the client stops resending a dead session id.
    await destroySession(request);
    response.clearCookie("event-florist.sid", sessionCookieOptions);
    throw new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue");
  }

  request.authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
  };
  // Without this call the request would never reach the route handler and
  // every authenticated request would hang forever.
  next();
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
