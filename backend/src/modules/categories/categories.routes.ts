import { Router } from "express";

import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import {
  createCategoryController,
  deleteCategoryController,
  getCategoriesController,
} from "./categories.controller";

const categoriesRouter = Router();

categoriesRouter.get(
  "/",
  checkAuthenticated,
  asyncHandler(getCategoriesController),
);

categoriesRouter.post(
  "/",
  checkAuthenticated,
  asyncHandler(createCategoryController),
);

categoriesRouter.delete(
  "/:id",
  checkAuthenticated,
  asyncHandler(deleteCategoryController),
);

export { categoriesRouter };
