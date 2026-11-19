import bcrypt from "bcryptjs";
import User from "../models/User";
import { ApiError } from "../utils/ApiError";
import type { UserRole } from "../types";

const passwordRounds = 12;

export async function authenticateUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }
  return user;
}

export async function createStaffUser(input: { name: string; email: string; password: string }) {
  const passwordHash = await bcrypt.hash(input.password, passwordRounds);
  return User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: "Staff" satisfies UserRole,
  });
}
