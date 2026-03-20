import { Router } from "express";
import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import {
  createAccountController,
  deleteAccountController,
  getAccountBalanceHistoryController,
  getAccountByIdController,
  getAccountsController,
  getAccountTotalsConvertedController,
  getAccountTransactionsController,
  getWorkspaceBalanceHistoryController,
  updateAccountController,
} from "./accounts.controller";

const accountsRouter = Router();

accountsRouter.get("/", checkAuthenticated, asyncHandler(getAccountsController));
accountsRouter.get(
  "/totals-converted",
  checkAuthenticated,
  asyncHandler(getAccountTotalsConvertedController),
);
accountsRouter.get("/workspace-balance-history", checkAuthenticated, asyncHandler(getWorkspaceBalanceHistoryController));
accountsRouter.post("/", checkAuthenticated, asyncHandler(createAccountController));
accountsRouter.get("/:id", checkAuthenticated, asyncHandler(getAccountByIdController));
accountsRouter.patch("/:id", checkAuthenticated, asyncHandler(updateAccountController));
accountsRouter.delete("/:id", checkAuthenticated, asyncHandler(deleteAccountController));
accountsRouter.get("/:id/transactions", checkAuthenticated, asyncHandler(getAccountTransactionsController));
accountsRouter.get("/:id/balance-history", checkAuthenticated, asyncHandler(getAccountBalanceHistoryController));

export { accountsRouter };
