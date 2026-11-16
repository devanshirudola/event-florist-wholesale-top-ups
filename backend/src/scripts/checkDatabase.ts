import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";

async function checkDatabase() {
  try {
    await connectDatabase();
    const database = mongoose.connection.db;
    if (!database) throw new Error("MongoDB connection did not expose a database");
    const result = await database.admin().ping();
    if (result.ok !== 1) throw new Error("MongoDB ping did not return success");
    console.info(`MongoDB connection verified for database "${mongoose.connection.name}"`);
  } finally {
    await mongoose.disconnect();
  }
}

void checkDatabase().catch(() => {
  // Driver errors may contain the connection URI; never print them.
  console.error("MongoDB connection check failed; details were withheld to protect credentials");
  process.exitCode = 1;
});
