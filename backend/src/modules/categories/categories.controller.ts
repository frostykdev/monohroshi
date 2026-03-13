import type { Request, Response } from "express";
import { z } from "zod";

import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import {
  createCategoryForUser,
  deleteCategoryForUser,
  getCategoriesForUser,
  reorderCategoriesForUser,
  updateCategoryForUser,
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

const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  icon: z.string().trim().optional(),
});

const reorderSchema = z.object({
  orders: z.array(
    z.object({ id: z.string(), sortOrder: z.number().int().min(0) }),
  ),
});

export const updateCategoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  }

  const { id } = req.params;
  const category = await updateCategoryForUser(req.user.uid, id, parsed.data);

  res.status(HTTP_STATUS.ok).json({ success: true, data: { category } });
};

export const reorderCategoriesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  }

  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  }

  await reorderCategoriesForUser(req.user.uid, parsed.data.orders);

  res.status(HTTP_STATUS.ok).json({ success: true });
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
