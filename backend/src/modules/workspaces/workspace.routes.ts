import { Router } from "express";

import { checkAuthenticated } from "../../middlewares/check-authenticated";
import { asyncHandler } from "../../shared/async-handler";
import {
  cancelInvitationController,
  createWorkspaceController,
  getAllWorkspacesController,
  getCurrentWorkspaceController,
  getWorkspaceByIdController,
  inviteToCurrentWorkspaceController,
  updateCurrentWorkspaceController,
  updateWorkspaceByIdController,
} from "./workspace.controller";

const workspaceRouter = Router();

workspaceRouter.get(
  "/",
  checkAuthenticated,
  asyncHandler(getAllWorkspacesController),
);

workspaceRouter.get(
  "/current",
  checkAuthenticated,
  asyncHandler(getCurrentWorkspaceController),
);

workspaceRouter.patch(
  "/current",
  checkAuthenticated,
  asyncHandler(updateCurrentWorkspaceController),
);

workspaceRouter.post(
  "/current/invites",
  checkAuthenticated,
  asyncHandler(inviteToCurrentWorkspaceController),
);

workspaceRouter.delete(
  "/current/invites/:inviteId",
  checkAuthenticated,
  asyncHandler(cancelInvitationController),
);

workspaceRouter.get(
  "/:id",
  checkAuthenticated,
  asyncHandler(getWorkspaceByIdController),
);

workspaceRouter.patch(
  "/:id",
  checkAuthenticated,
  asyncHandler(updateWorkspaceByIdController),
);

workspaceRouter.post(
  "/",
  checkAuthenticated,
  asyncHandler(createWorkspaceController),
);

export { workspaceRouter };
