import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { env } from "../config/env";
import User from "../models/User";

async function seedAdministrator() {
  await connectDatabase();
  if (!env.ADMIN_EMAIL || !env.ADMIN_NAME || !env.ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD before seeding");
  }

  await User.findOneAndUpdate(
    { email: env.ADMIN_EMAIL.toLowerCase() },
    { $setOnInsert: {
      email: env.ADMIN_EMAIL.toLowerCase(),
      name: env.ADMIN_NAME,
      role: "Administrator",
      passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
    } },
    { upsert: true, new: true },
  );

  console.info("Administrator account is ready; no catalog or activity fixtures were inserted.");
  await mongoose.disconnect();
}

void seedAdministrator().catch(async () => {
  console.error("Failed to prepare the administrator account; details were withheld to protect credentials");
  await mongoose.disconnect();
  process.exitCode = 1;
});
