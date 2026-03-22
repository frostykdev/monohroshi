import { Router } from "express";

import { checkAuthorized } from "../../middlewares/check-authorized";
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
  checkAuthorized,
  asyncHandler(getCategoriesController),
);

categoriesRouter.post(
  "/",
  checkAuthorized,
  asyncHandler(createCategoryController),
);

categoriesRouter.patch(
  "/reorder",
  checkAuthorized,
  asyncHandler(reorderCategoriesController),
);

categoriesRouter.patch(
  "/:id",
  checkAuthorized,
  asyncHandler(updateCategoryController),
);

categoriesRouter.delete(
  "/:id",
  checkAuthorized,
  asyncHandler(deleteCategoryController),
);

export { categoriesRouter };
