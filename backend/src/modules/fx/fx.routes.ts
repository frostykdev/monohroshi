import { Router } from "express";
import { checkAuthorized } from "../../middlewares/check-authorized";
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
fxRouter.get("/rates", checkAuthorized, asyncHandler(getRatesController));

/** GET /v1/fx/convert?amount=100&from=USD&to=UAH&date=2026-03-15 */
fxRouter.get("/convert", checkAuthorized, asyncHandler(convertController));

export { fxRouter };
