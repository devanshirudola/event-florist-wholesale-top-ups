import type { UserRole } from "./index";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export {};
