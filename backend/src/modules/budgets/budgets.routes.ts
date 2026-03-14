import { Router } from "express";
import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import {
  createBudgetController,
  deleteBudgetController,
  getBudgetsController,
  updateBudgetController,
} from "./budgets.controller";

const budgetsRouter = Router();

budgetsRouter.get("/", checkAuthenticated, asyncHandler(getBudgetsController));
budgetsRouter.post("/", checkAuthenticated, asyncHandler(createBudgetController));
budgetsRouter.patch("/:id", checkAuthenticated, asyncHandler(updateBudgetController));
budgetsRouter.delete("/:id", checkAuthenticated, asyncHandler(deleteBudgetController));

export { budgetsRouter };
