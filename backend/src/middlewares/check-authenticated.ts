import type { NextFunction, Request, Response } from "express";

import { firebaseAuth } from "../config/firebase";
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

export const checkAuthenticated = async (
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
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    next(new ApiError("Invalid or expired Firebase token", HTTP_STATUS.forbidden));
  }
};
