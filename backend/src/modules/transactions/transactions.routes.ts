import { Router } from "express";
import { checkAuthorized } from "../../middlewares/check-authorized";
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
  checkAuthorized,
  asyncHandler(getTransactionsController),
);
transactionsRouter.post(
  "/",
  checkAuthorized,
  asyncHandler(createTransactionController),
);
transactionsRouter.get(
  "/stats",
  checkAuthorized,
  asyncHandler(getTransactionStatsController),
);
transactionsRouter.get(
  "/:id",
  checkAuthorized,
  asyncHandler(getTransactionByIdController),
);
transactionsRouter.patch(
  "/:id",
  checkAuthorized,
  asyncHandler(updateTransactionController),
);
transactionsRouter.delete(
  "/:id",
  checkAuthorized,
  asyncHandler(deleteTransactionController),
);

export { transactionsRouter };
