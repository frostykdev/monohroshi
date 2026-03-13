import { Router } from "express";
import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import {
  createAccountController,
  deleteAccountController,
  getAccountByIdController,
  getAccountsController,
  getAccountTransactionsController,
  updateAccountController,
} from "./accounts.controller";

const accountsRouter = Router();

accountsRouter.get("/", checkAuthenticated, asyncHandler(getAccountsController));
accountsRouter.post("/", checkAuthenticated, asyncHandler(createAccountController));
accountsRouter.get("/:id", checkAuthenticated, asyncHandler(getAccountByIdController));
accountsRouter.patch("/:id", checkAuthenticated, asyncHandler(updateAccountController));
accountsRouter.delete("/:id", checkAuthenticated, asyncHandler(deleteAccountController));
accountsRouter.get("/:id/transactions", checkAuthenticated, asyncHandler(getAccountTransactionsController));

export { accountsRouter };
