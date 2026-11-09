import "dotenv/config";
import cors from "cors";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import MongoStore from "connect-mongo";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import apiRouter from "./routes/api";
import { ApiError } from "./utils/ApiError";

export function createApp() {
  const app = express();
  if (env.NODE_ENV === "production") app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === env.FRONTEND_ORIGIN) {
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
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  app.get("/health", (_request, response) => {
    response.status(200).json({ success: true, data: { status: "ok" } });
  });
  app.use("/api/v1", apiRouter);
  app.use((_request, _response, next) => {
    next(new ApiError(404, "ROUTE_NOT_FOUND", "API route was not found"));
  });
  app.use(errorHandler);
  return app;
}
