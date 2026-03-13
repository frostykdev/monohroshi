import type { Request, Response } from "express";
import { z } from "zod";

import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import {
  cancelInvitation,
  createWorkspaceForUser,
  deleteWorkspace,
  getAllWorkspacesForUser,
  getCurrentWorkspaceForUser,
  getWorkspaceByIdForUser,
  inviteToCurrentWorkspace,
  updateCurrentWorkspace,
  updateWorkspaceById,
} from "./workspace.service";

const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  currency: z.string().trim().min(2).max(10).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
});

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  currency: z.string().trim().min(2).max(10).optional(),
});

export const getCurrentWorkspaceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const workspace = await getCurrentWorkspaceForUser(req.user.uid);

  res.status(HTTP_STATUS.ok).json({ success: true, data: { workspace } });
};

export const updateCurrentWorkspaceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const parsed = updateWorkspaceSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  }

  const workspace = await updateCurrentWorkspace(req.user.uid, {
    name: parsed.data.name,
    currency: parsed.data.currency,
  });

  res.status(HTTP_STATUS.ok).json({ success: true, data: { workspace } });
};

export const inviteToCurrentWorkspaceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const parsed = inviteMemberSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError("Invalid email address", HTTP_STATUS.badRequest);
  }

  await inviteToCurrentWorkspace(req.user.uid, parsed.data.email);

  res.status(HTTP_STATUS.ok).json({ success: true });
};

export const getAllWorkspacesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const workspaces = await getAllWorkspacesForUser(req.user.uid);

  res.status(HTTP_STATUS.ok).json({ success: true, data: { workspaces } });
};

export const getWorkspaceByIdController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const { id } = req.params;

  const workspace = await getWorkspaceByIdForUser(req.user.uid, id);

  res.status(HTTP_STATUS.ok).json({ success: true, data: { workspace } });
};

export const cancelInvitationController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const { inviteId } = req.params;

  await cancelInvitation(req.user.uid, inviteId);

  res.status(HTTP_STATUS.ok).json({ success: true });
};

export const updateWorkspaceByIdController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const { id } = req.params;
  const parsed = updateWorkspaceSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  }

  const workspace = await updateWorkspaceById(req.user.uid, id, {
    name: parsed.data.name,
    currency: parsed.data.currency,
  });

  res.status(HTTP_STATUS.ok).json({ success: true, data: { workspace } });
};

export const deleteWorkspaceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const { id } = req.params;
  await deleteWorkspace(req.user.uid, id);

  res.status(HTTP_STATUS.ok).json({ success: true });
};

export const createWorkspaceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const parsed = createWorkspaceSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  }

  const workspace = await createWorkspaceForUser(
    req.user.uid,
    parsed.data.name,
    parsed.data.currency,
  );

  res.status(HTTP_STATUS.created).json({ success: true, data: { workspace } });
};
