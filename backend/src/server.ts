import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { createFirstAdmin } from "./controllers/authController";
import User from "./models/User";

async function start() {
  await connectDatabase();
  if (await createFirstAdmin()) console.info("Created the configured first administrator");
  if (!await User.exists({ role: "Administrator" })) {
    throw new Error("No administrator exists. Configure ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD, then run the seed command.");
  }
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.info(`Event Florist API listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.info(`Received ${signal}; shutting down`);
    server.close((error) => {
      if (error) {
        console.error("Failed to close the HTTP server cleanly", error);
        process.exitCode = 1;
      }
      void mongoose.disconnect();
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

void start().catch((error: unknown) => {
  console.error("Failed to start Event Florist API", error);
  process.exitCode = 1;
});
