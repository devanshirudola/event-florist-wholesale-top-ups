import "dotenv/config";
import cors from "cors";
import express, { type RequestHandler } from "express";
import session from "express-session";
import helmet from "helmet";
import MongoStore from "connect-mongo";
import { connectDatabase } from "./config/database";
import { env, frontendOrigins } from "./config/env";
import { sessionCookieOptions } from "./config/session";
import { errorHandler } from "./middleware/errorHandler";
import apiRouter from "./routes/api";
import { ApiError } from "./utils/ApiError";

// Requests must not reach the API routes before Mongo is ready. Memoised by
// connectDatabase so this costs nothing on a warm instance.
const databaseGuard: RequestHandler = (_request, _response, next) => {
  if (env.NODE_ENV === "test") {
    next();
    return;
  }
  connectDatabase().then(
    () => next(),
    (error: unknown) => {
      console.error("MongoDB connection failed", error);
      next(new ApiError(503, "DATABASE_UNAVAILABLE", "The database is temporarily unavailable"));
    },
  );
};

export function createApp() {
  const app = express();
  if (env.NODE_ENV === "production") app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || frontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new ApiError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed to access the API"));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(session({
    name: "event-florist.sid",
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: env.NODE_ENV === "test" ? undefined : MongoStore.create({
      mongoUrl: env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60,
    }),
    cookie: {
      ...sessionCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  app.get("/health", (_request, response) => {
    response.status(200).json({ success: true, data: { status: "ok" } });
  });
  app.use("/api/v1", databaseGuard, apiRouter);
  app.use((_request, _response, next) => {
    next(new ApiError(404, "ROUTE_NOT_FOUND", "API route was not found"));
  });
  app.use(errorHandler);
  return app;
}

// Vercel detects Express apps through a default-exported app instance in
// `src/app.ts` (zero-configuration detection), so every route — including
// `/health` — is served from a single function with the original request path.
const app = createApp();

export default app;
