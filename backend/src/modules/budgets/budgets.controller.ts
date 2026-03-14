import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import {
  createBudgetForWorkspace,
  deleteBudgetForWorkspace,
  getBudgetsForWorkspace,
  updateBudgetForWorkspace,
} from "./budgets.service";

const createBudgetSchema = z.object({
  amount: z.string().trim().min(1),
  categoryId: z.string().nullable().optional(),
  workspaceId: z.string().optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

const updateBudgetSchema = z.object({
  amount: z.string().trim().min(1).optional(),
});

export const getBudgetsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const workspaceId = req.query.workspaceId as string | undefined;
  const month = req.query.month as string | undefined;
  const budgets = await getBudgetsForWorkspace(req.user.uid, workspaceId, month);
  res.status(HTTP_STATUS.ok).json({ success: true, data: { budgets } });
};

export const createBudgetController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const parsed = createBudgetSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  const budget = await createBudgetForWorkspace(req.user.uid, parsed.data);
  res.status(HTTP_STATUS.created).json({ success: true, data: { budget } });
};

export const updateBudgetController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const parsed = updateBudgetSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  const budget = await updateBudgetForWorkspace(
    req.user.uid,
    req.params.id,
    parsed.data,
  );
  res.status(HTTP_STATUS.ok).json({ success: true, data: { budget } });
};

export const deleteBudgetController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  await deleteBudgetForWorkspace(req.user.uid, req.params.id);
  res.status(HTTP_STATUS.ok).json({ success: true });
};
