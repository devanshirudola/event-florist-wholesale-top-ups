import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import User from "../models/User";

vi.mock("../models/User", () => ({
  default: { findById: vi.fn() },
}));

const findById = User.findById as unknown as ReturnType<typeof vi.fn>;

let requireAuth: RequestHandler;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/event_florist_test";
  process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  ({ requireAuth } = await import("./auth"));
});

beforeEach(() => {
  vi.resetAllMocks();
});

function makeRequest(userId?: string): Request {
  return {
    session: {
      ...(userId ? { userId } : {}),
      destroy: (callback: (error?: Error) => void) => callback(),
    },
  } as unknown as Request;
}

function makeResponse(): Response & { clearCookie: ReturnType<typeof vi.fn> } {
  return { clearCookie: vi.fn() } as unknown as Response & { clearCookie: ReturnType<typeof vi.fn> };
}

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function mockActiveUser(isActive: boolean) {
  findById.mockReturnValue({
    select: vi.fn().mockResolvedValue({
      id: "u1",
      name: "Test User",
      email: "user@example.com",
      role: "Administrator",
      isActive,
    }),
  });
}

describe("requireAuth", () => {
  // Regression test: requireAuth used to resolve without calling next(), which
  // left every authenticated request hanging forever with no response.
  it("hands control to the next handler for an active user", async () => {
    mockActiveUser(true);
    const request = makeRequest("u1");
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(request, makeResponse(), next);
    await flush();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(request.authUser).toMatchObject({ id: "u1", role: "Administrator" });
  });

  it("rejects requests without a session user", async () => {
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(makeRequest(), makeResponse(), next);
    await flush();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, code: "UNAUTHENTICATED" }),
    );
  });

  it("revokes the session and clears the cookie for an inactive user", async () => {
    mockActiveUser(false);
    const request = makeRequest("u1");
    const response = makeResponse();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(request, response, next);
    await flush();

    expect(response.clearCookie).toHaveBeenCalledWith("event-florist.sid", expect.any(Object));
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, code: "UNAUTHENTICATED" }),
    );
    expect(request.authUser).toBeUndefined();
  });

  it("maps a failed user lookup to a 401 instead of a 500", async () => {
    findById.mockReturnValue({
      select: vi.fn().mockRejectedValue(new Error("connection lost")),
    });
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(makeRequest("u1"), makeResponse(), next);
    await flush();

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, code: "UNAUTHENTICATED" }),
    );
  });
});
