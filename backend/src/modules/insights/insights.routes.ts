import { Router } from "express";
import { checkAuthorized } from "../../middlewares/check-authorized";
import { asyncHandler } from "../../shared/async-handler";
import { chatController } from "./insights.controller";

const insightsRouter = Router();

insightsRouter.post("/chat", checkAuthorized, asyncHandler(chatController));

export { insightsRouter };
