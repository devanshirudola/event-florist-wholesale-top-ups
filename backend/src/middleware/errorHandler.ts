import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

type BodyParserError = { type?: unknown; status?: unknown; statusCode?: unknown };

function bodyErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as BodyParserError;
  if (typeof candidate.type !== "string") return undefined;
  const status = typeof candidate.status === "number"
    ? candidate.status
    : typeof candidate.statusCode === "number"
      ? candidate.statusCode
      : undefined;
  return typeof status === "number" && status >= 400 && status < 500 ? status : undefined;
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    // The response already started streaming; hand the error back to Express
    // instead of attempting to write a second set of headers.
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
    return;
  }

  // body-parser failures (malformed JSON, oversized or unsupported payloads)
  // must report 4xx, not a generic 500.
  const parserStatus = bodyErrorStatus(error);
  if (parserStatus !== undefined) {
    const code = parserStatus === 413 ? "PAYLOAD_TOO_LARGE" : parserStatus === 415 ? "UNSUPPORTED_MEDIA_TYPE" : "INVALID_REQUEST_BODY";
    const message = parserStatus === 413
      ? "The request body exceeds the 1mb limit"
      : parserStatus === 415
        ? "The request content type is not supported"
        : "The request body is not valid JSON";
    response.status(parserStatus).json({ success: false, error: { code, message } });
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
