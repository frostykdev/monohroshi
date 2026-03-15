import { Router } from "express";
import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import {
  convertController,
  getRatesController,
  refreshDailyController,
} from "./fx.controller";

const fxRouter = Router();

/** POST /v1/fx/refresh-daily — secured by x-api-key header, no Firebase auth needed */
fxRouter.post("/refresh-daily", asyncHandler(refreshDailyController));

/** GET /v1/fx/rates?base=USD&date=2026-03-15 */
fxRouter.get("/rates", checkAuthenticated, asyncHandler(getRatesController));

/** GET /v1/fx/convert?amount=100&from=USD&to=UAH&date=2026-03-15 */
fxRouter.get("/convert", checkAuthenticated, asyncHandler(convertController));

export { fxRouter };
