import { Router } from "express";

import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import { getMeController } from "./auth.controller";

const authRouter = Router();

authRouter.get("/me", checkAuthenticated, asyncHandler(getMeController));

export { authRouter };
