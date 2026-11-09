import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must contain at least 32 characters"),
  // "strict" and "lax" work while the frontend and API share a registrable
  // domain (example.com, *.vercel.app). Separate domains require "none",
  // which browsers only accept together with Secure cookies.
  SESSION_COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("strict"),
  // One or more trusted browser origins, comma separated.
  FRONTEND_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_NAME: z.string().min(2).optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
});

const parsed = envSchema.parse(process.env);

const origins = parsed.FRONTEND_ORIGIN
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const invalidOrigins = origins.filter((origin) => !z.string().url().safeParse(origin).success);
if (invalidOrigins.length > 0) {
  throw new Error(
    `FRONTEND_ORIGIN contains invalid URLs: ${invalidOrigins.join(", ")}. `
    + "Use a comma-separated list, for example https://my-app.vercel.app,http://localhost:3000",
  );
}

export const env = parsed;
export const frontendOrigins = origins;
