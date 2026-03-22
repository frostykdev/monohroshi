import { Router } from "express";

import { checkAuthorized } from "../../middlewares/check-authorized";
import { asyncHandler } from "../../shared/async-handler";
import {
  createTagController,
  deleteTagController,
  getTagsController,
  updateTagController,
} from "./tags.controller";

const tagsRouter = Router();

tagsRouter.get("/", checkAuthorized, asyncHandler(getTagsController));
tagsRouter.post("/", checkAuthorized, asyncHandler(createTagController));
tagsRouter.patch("/:id", checkAuthorized, asyncHandler(updateTagController));
tagsRouter.delete("/:id", checkAuthorized, asyncHandler(deleteTagController));

export { tagsRouter };
