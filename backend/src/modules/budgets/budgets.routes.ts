import { Router } from "express";
import { checkAuthorized } from "../../middlewares/check-authorized";
import { asyncHandler } from "../../shared/async-handler";
import {
  createBudgetController,
  deleteBudgetController,
  getBudgetsController,
  updateBudgetController,
} from "./budgets.controller";

const budgetsRouter = Router();

budgetsRouter.get("/", checkAuthorized, asyncHandler(getBudgetsController));
budgetsRouter.post("/", checkAuthorized, asyncHandler(createBudgetController));
budgetsRouter.patch("/:id", checkAuthorized, asyncHandler(updateBudgetController));
budgetsRouter.delete("/:id", checkAuthorized, asyncHandler(deleteBudgetController));

export { budgetsRouter };
