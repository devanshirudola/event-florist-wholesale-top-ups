import { env } from "./env";

// Cookie attributes must match on set and clear, so they live in one place.
// SameSite "none" is only accepted by browsers alongside Secure, hence the
// forced secure flag.
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: env.SESSION_COOKIE_SAMESITE,
  secure: env.NODE_ENV === "production" || env.SESSION_COOKIE_SAMESITE === "none",
};
