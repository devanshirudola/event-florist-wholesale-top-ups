import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";

let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/event_florist_test";
  process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  process.env.FRONTEND_ORIGIN = "http://localhost:3000";
  const module = await import("./app");
  app = module.createApp();
});

describe("API boundary", () => {
  it("reports API health without a database connection", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: "ok" } });
  });

  it("rejects protected API calls without a session", async () => {
    const response = await request(app).get("/api/v1/products");
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("reports malformed JSON as a 400 instead of a 500", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send("{ this is not json");
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "INVALID_REQUEST_BODY" },
    });
  });

  it("reports an oversized payload as a 413", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ padding: "x".repeat(2 * 1024 * 1024) }));
    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "PAYLOAD_TOO_LARGE" },
    });
  });

  it("returns a structured 404 for unknown routes", async () => {
    const response = await request(app).get("/nope");
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "ROUTE_NOT_FOUND" },
    });
  });

  it("keeps the authentication check ahead of route discovery", async () => {
    // Unknown /api/v1 paths must not reveal which routes exist to anonymous callers.
    const response = await request(app).get("/api/v1/does-not-exist");
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "UNAUTHENTICATED" },
    });
  });
});
