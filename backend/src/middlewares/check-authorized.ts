import type { NextFunction, Request, Response } from "express";

import { firebaseAuth } from "../config/firebase";
import { prisma } from "../lib/prisma";
import { ApiError } from "../shared/errors/api-error";
import { HTTP_STATUS } from "../shared/http-status";

const extractBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const checkAuthorized = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractBearerToken(req.header("authorization"));

    if (!token) {
      throw new ApiError("Missing or invalid authorization header", HTTP_STATUS.unauthorized);
    }

    const decodedToken = await firebaseAuth.verifyIdToken(token, true);
    req.user = decodedToken;

    const dbUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!dbUser) {
      throw new ApiError("Onboarding not completed", HTTP_STATUS.forbidden);
    }

    req.dbUser = dbUser;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    next(new ApiError("Invalid or expired Firebase token", HTTP_STATUS.unauthorized));
  }
};
