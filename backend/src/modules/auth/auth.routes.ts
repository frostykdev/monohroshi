import { Router } from "express";

import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import {
  completeOnboardingController,
  deleteAccountController,
  getMeController,
} from "./auth.controller";

const authRouter = Router();

authRouter.get("/me", checkAuthenticated, asyncHandler(getMeController));
authRouter.delete("/me", checkAuthenticated, asyncHandler(deleteAccountController));
authRouter.post(
  "/onboarding/complete",
  checkAuthenticated,
  asyncHandler(completeOnboardingController),
);

export { authRouter };
