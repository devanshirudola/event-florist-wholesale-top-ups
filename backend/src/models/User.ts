import { model, models, Schema, type InferSchemaType } from "mongoose";
import type { UserRole } from "../types";

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["Administrator", "Staff"] satisfies UserRole[], default: "Staff", required: true },
  isActive: { type: Boolean, default: true, required: true },
}, { timestamps: true });

export type UserRecord = InferSchemaType<typeof userSchema>;
export default models.User || model("User", userSchema);
