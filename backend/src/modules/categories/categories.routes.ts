import { Router } from "express";

import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import {
  createCategoryController,
  deleteCategoryController,
  getCategoriesController,
  reorderCategoriesController,
  updateCategoryController,
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

categoriesRouter.patch(
  "/reorder",
  checkAuthenticated,
  asyncHandler(reorderCategoriesController),
);

categoriesRouter.patch(
  "/:id",
  checkAuthenticated,
  asyncHandler(updateCategoryController),
);

categoriesRouter.delete(
  "/:id",
  checkAuthenticated,
  asyncHandler(deleteCategoryController),
);

export { categoriesRouter };
