import type { Request, Response } from "express";
import { z } from "zod";

import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import {
  createCategoryForUser,
  deleteCategoryForUser,
  getCategoriesForUser,
} from "./categories.service";

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.enum(["expense", "income"]),
  icon: z.string().trim().optional(),
  workspaceId: z.string().optional(),
});

export const getCategoriesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const workspaceId = req.query.workspaceId as string | undefined;
  const categories = await getCategoriesForUser(req.user.uid, workspaceId);

  res.status(HTTP_STATUS.ok).json({ success: true, data: { categories } });
};

export const createCategoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  }

  const category = await createCategoryForUser(req.user.uid, parsed.data);

  res.status(HTTP_STATUS.created).json({ success: true, data: { category } });
};

export const deleteCategoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const { id } = req.params;
  await deleteCategoryForUser(req.user.uid, id);

  res.status(HTTP_STATUS.ok).json({ success: true });
};
