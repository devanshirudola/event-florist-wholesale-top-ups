import bcrypt from "bcryptjs";
import User from "../models/User";
import { ApiError } from "../utils/ApiError";
import type { UserRole } from "../types";

const passwordRounds = 12;

// A real bcrypt hash of a throwaway value. Unknown accounts are compared
// against it so that a missing account and a wrong password cost the same
// amount of time (prevents account enumeration by timing).
const timingEqualiserHash = "$2a$12$rodPTtD0AuWxhawYG0c3/OSW7lQ0er0sZiOBg1AcNDjFXszkGdAwC";

export async function authenticateUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select("+passwordHash");
  const matches = await bcrypt.compare(password, user?.passwordHash ?? timingEqualiserHash);
  if (!user || !matches) {
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
