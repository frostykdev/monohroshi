import { Router } from "express";
import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import {
  createTransactionController,
  getTransactionsController,
  getTransactionStatsController,
} from "./transactions.controller";

const transactionsRouter = Router();

transactionsRouter.get(
  "/",
  checkAuthenticated,
  asyncHandler(getTransactionsController),
);
transactionsRouter.post(
  "/",
  checkAuthenticated,
  asyncHandler(createTransactionController),
);
transactionsRouter.get(
  "/stats",
  checkAuthenticated,
  asyncHandler(getTransactionStatsController),
);

export { transactionsRouter };
