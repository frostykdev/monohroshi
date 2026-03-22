import type { User } from "@prisma/client";
import type { DecodedIdToken } from "firebase-admin/auth";

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
      dbUser?: User;
    }
  }
}

export {};
