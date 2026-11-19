import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten() },
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "The submitted data is invalid" },
    });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({
      success: false,
      error: { code: "INVALID_ID", message: "A request identifier is invalid" },
    });
    return;
  }

  if (error && typeof error === "object" && "code" in error && error.code === 11000) {
    response.status(409).json({
      success: false,
      error: { code: "DUPLICATE_RESOURCE", message: "A record with the same unique value already exists" },
    });
    return;
  }

  console.error("Unhandled API error", error);
  response.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred" },
  });
};
