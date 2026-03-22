import { Router } from "express";

import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { checkAuthorized } from "../../middlewares/check-authorized";
import { asyncHandler } from "../../shared/async-handler";
import {
  completeOnboardingController,
  deleteAccountController,
  getMeController,
} from "./auth.controller";

const authRouter = Router();

authRouter.get("/me", checkAuthorized, asyncHandler(getMeController));
authRouter.delete("/me", checkAuthorized, asyncHandler(deleteAccountController));
authRouter.post(
  "/onboarding/complete",
  checkAuthenticated,
  asyncHandler(completeOnboardingController),
);

export { authRouter };
