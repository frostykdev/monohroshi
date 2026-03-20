import { Router } from "express";
import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import { chatController } from "./insights.controller";

const insightsRouter = Router();

insightsRouter.post("/chat", checkAuthenticated, asyncHandler(chatController));

export { insightsRouter };
