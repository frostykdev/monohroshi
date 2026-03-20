import { Router } from "express";
import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import {
  createTransactionController,
  getTransactionByIdController,
  getTransactionsController,
  getTransactionStatsController,
  updateTransactionController,
  deleteTransactionController,
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
transactionsRouter.get(
  "/:id",
  checkAuthenticated,
  asyncHandler(getTransactionByIdController),
);
transactionsRouter.patch(
  "/:id",
  checkAuthenticated,
  asyncHandler(updateTransactionController),
);
transactionsRouter.delete(
  "/:id",
  checkAuthenticated,
  asyncHandler(deleteTransactionController),
);

export { transactionsRouter };
