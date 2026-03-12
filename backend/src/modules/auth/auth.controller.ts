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
  workspace: z.object({
    name: z.string().min(1),
    currency: z.string().min(1),
  }),
  account: z.object({
    name: z.string(),
    type: z.string().min(1),
    currency: z.string().min(1),
    balance: z.string(),
    isPrimary: z.boolean(),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
  categories: z.array(
    z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      icon: z.string().min(1),
      isSystem: z.boolean().optional(),
      systemCode: z.string().optional(),
    }),
  ),
});

export const getMeController = async (
  req: Request,
  res: Response,
): Promise<void> => {
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
    workspace: parsed.data.workspace,
    account: parsed.data.account,
    categories: parsed.data.categories,
  });

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
};
