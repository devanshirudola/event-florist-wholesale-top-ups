import type { Request } from "express";
import { ApiError } from "./ApiError";

export function pathParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(400, "INVALID_ROUTE_PARAMETER", `A valid ${name} is required`);
  }
  return value;
}
