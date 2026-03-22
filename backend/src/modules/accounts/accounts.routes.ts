import { Router } from "express";
import { checkAuthorized } from "../../middlewares/check-authorized";
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

accountsRouter.get("/", checkAuthorized, asyncHandler(getAccountsController));
accountsRouter.get(
  "/totals-converted",
  checkAuthorized,
  asyncHandler(getAccountTotalsConvertedController),
);
accountsRouter.get("/workspace-balance-history", checkAuthorized, asyncHandler(getWorkspaceBalanceHistoryController));
accountsRouter.post("/", checkAuthorized, asyncHandler(createAccountController));
accountsRouter.get("/:id", checkAuthorized, asyncHandler(getAccountByIdController));
accountsRouter.patch("/:id", checkAuthorized, asyncHandler(updateAccountController));
accountsRouter.delete("/:id", checkAuthorized, asyncHandler(deleteAccountController));
accountsRouter.get("/:id/transactions", checkAuthorized, asyncHandler(getAccountTransactionsController));
accountsRouter.get("/:id/balance-history", checkAuthorized, asyncHandler(getAccountBalanceHistoryController));

export { accountsRouter };
