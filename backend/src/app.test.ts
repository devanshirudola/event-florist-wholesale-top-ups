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
});
