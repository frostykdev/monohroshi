import { Router } from "express";

import { checkAuthorized } from "../../middlewares/check-authorized";
import { asyncHandler } from "../../shared/async-handler";
import {
  cancelInvitationController,
  createWorkspaceController,
  deleteWorkspaceController,
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
  checkAuthorized,
  asyncHandler(getAllWorkspacesController),
);

workspaceRouter.get(
  "/current",
  checkAuthorized,
  asyncHandler(getCurrentWorkspaceController),
);

workspaceRouter.patch(
  "/current",
  checkAuthorized,
  asyncHandler(updateCurrentWorkspaceController),
);

workspaceRouter.post(
  "/current/invites",
  checkAuthorized,
  asyncHandler(inviteToCurrentWorkspaceController),
);

workspaceRouter.delete(
  "/current/invites/:inviteId",
  checkAuthorized,
  asyncHandler(cancelInvitationController),
);

workspaceRouter.get(
  "/:id",
  checkAuthorized,
  asyncHandler(getWorkspaceByIdController),
);

workspaceRouter.patch(
  "/:id",
  checkAuthorized,
  asyncHandler(updateWorkspaceByIdController),
);

workspaceRouter.delete(
  "/:id",
  checkAuthorized,
  asyncHandler(deleteWorkspaceController),
);

workspaceRouter.post(
  "/",
  checkAuthorized,
  asyncHandler(createWorkspaceController),
);

export { workspaceRouter };
