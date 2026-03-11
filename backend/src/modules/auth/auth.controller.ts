import type { Request, Response } from "express";
import { z } from "zod";

import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import {
  completeOnboardingForCurrentUser,
  getCurrentUserByFirebaseUid,
} from "./auth.service";

const completeOnboardingSchema = z.object({
  onboarding: z.record(z.string(), z.unknown()),
});

export const getMeController = async (req: Request, res: Response): Promise<void> => {
  const firebaseUser = req.user;

  if (!firebaseUser) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const user = await getCurrentUserByFirebaseUid(firebaseUser.uid);

  if (!user) {
    throw new ApiError("User account not found", HTTP_STATUS.notFound);
  }

  res.status(200).json({
    success: true,
    data: {
      user,
      firebase: {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? null,
      },
    },
  });
};

export const completeOnboardingController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const firebaseUser = req.user;

  if (!firebaseUser) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const parsed = completeOnboardingSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError("Invalid onboarding payload", HTTP_STATUS.badRequest);
  }

  const user = await completeOnboardingForCurrentUser({
    firebaseUid: firebaseUser.uid,
    email: firebaseUser.email ?? null,
    name: firebaseUser.name ?? null,
    onboarding: parsed.data.onboarding,
  });

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
};
