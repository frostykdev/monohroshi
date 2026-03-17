import type { Request, Response } from "express";
import { z } from "zod";

import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import {
  createTagForUser,
  deleteTagForUser,
  getTagsForUser,
  updateTagForUser,
} from "./tags.service";

const createTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().trim().optional(),
  workspaceId: z.string().optional(),
});

const updateTagSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: z.string().trim().nullable().optional(),
});

export const getTagsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const workspaceId = req.query.workspaceId as string | undefined;
  const tags = await getTagsForUser(req.user.uid, workspaceId);
  res.status(HTTP_STATUS.ok).json({ success: true, data: { tags } });
};

export const createTagController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const parsed = createTagSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  const tag = await createTagForUser(req.user.uid, parsed.data);
  res.status(HTTP_STATUS.created).json({ success: true, data: { tag } });
};

export const updateTagController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const parsed = updateTagSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  const { id } = req.params;
  const tag = await updateTagForUser(req.user.uid, id, parsed.data);
  res.status(HTTP_STATUS.ok).json({ success: true, data: { tag } });
};

export const deleteTagController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const { id } = req.params;
  await deleteTagForUser(req.user.uid, id);
  res.status(HTTP_STATUS.ok).json({ success: true });
};
