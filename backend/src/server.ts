import "dotenv/config";
import app from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { createFirstAdmin } from "./controllers/authController";
import User from "./models/User";

async function start() {
  const server = app.listen(env.PORT, () => {
    console.info(`Event Florist API listening on port ${env.PORT}`);
  });

  // Bind the HTTP server before connecting to MongoDB so /health remains
  // reachable and API requests can return a structured 503 while the database
  // is unavailable. The database guard retries connection on later requests.
  try {
    await connectDatabase();
    if (await createFirstAdmin()) console.info("Created the configured first administrator");
    if (!await User.exists({ role: "Administrator" })) {
      console.error("No administrator exists. Configure ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD, then run the seed command.");
    }
  } catch {
    console.error("Database initialization failed; health checks remain available and API requests will return 503 until MongoDB is reachable");
  }

  const shutdown = (signal: string) => {
    console.info(`Received ${signal}; shutting down`);
    server.close((error) => {
      if (error) {
        console.error("Failed to close the HTTP server cleanly");
        process.exitCode = 1;
      }
      void disconnectDatabase();
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

// On Vercel the platform invokes the app exported from `src/app.ts` directly,
// so this file only bootstraps a long-running server (Render, Railway, Docker).
if (!process.env.VERCEL) void start();

export default app;
