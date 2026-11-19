import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { env } from "../config/env";
import User from "../models/User";

async function seedAdministrator() {
  await connectDatabase();
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || !env.ADMIN_NAME) {
    throw new Error("Set ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD before seeding");
  }

  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.info(`Administrator account ${email} already exists; no records were changed.`);
    return;
  }

  await User.create({
    email,
    name: env.ADMIN_NAME,
    role: "Administrator",
    passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
  });
  console.info(`Created administrator account ${email}.`);
}

void seedAdministrator().catch(async (error: unknown) => {
  console.error("Failed to seed the administrator account", error);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
