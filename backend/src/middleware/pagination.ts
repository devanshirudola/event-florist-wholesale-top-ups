import type { RequestHandler } from "express";
import { z } from "zod";
import type { PageQuery } from "../types";
import { ApiError } from "../utils/ApiError";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).default(""),
});

declare global {
  namespace Express {
    interface Request {
      pageQuery?: PageQuery;
    }
  }
}

export const parsePageQuery: RequestHandler = (request, _response, next) => {
  const result = querySchema.safeParse(request.query);
  if (!result.success) {
    next(new ApiError(400, "VALIDATION_ERROR", "Invalid pagination or search query", result.error.flatten()));
    return;
  }
  request.pageQuery = result.data;
  next();
};
