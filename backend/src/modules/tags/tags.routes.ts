import { Router } from "express";

import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import {
  createTagController,
  deleteTagController,
  getTagsController,
  updateTagController,
} from "./tags.controller";

const tagsRouter = Router();

tagsRouter.get("/", checkAuthenticated, asyncHandler(getTagsController));
tagsRouter.post("/", checkAuthenticated, asyncHandler(createTagController));
tagsRouter.patch("/:id", checkAuthenticated, asyncHandler(updateTagController));
tagsRouter.delete("/:id", checkAuthenticated, asyncHandler(deleteTagController));

export { tagsRouter };
