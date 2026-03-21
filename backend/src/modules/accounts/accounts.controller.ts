import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import {
  createAccountForUser,
  deleteAccountForUser,
  getAccountById,
  getAccountsForWorkspace,
  getAccountTotalsConverted,
  getBalanceHistoryForAccount,
  getWorkspaceBalanceHistory,
  getTransactionsForAccount,
  updateAccountForUser,
} from "./accounts.service";

const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1),
  currency: z.string().trim().min(1),
  balance: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isPrimary: z.boolean().optional(),
  workspaceId: z.string().optional(),
});

const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  type: z.string().trim().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  /** Array of currency balances to upsert. Each entry creates or updates an AccountBalance row. */
  balances: z
    .array(z.object({ currency: z.string().trim().min(1), balance: z.string() }))
    .optional(),
});

export const getAccountsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const workspaceId = req.query.workspaceId as string | undefined;
  const accounts = await getAccountsForWorkspace(req.user.uid, workspaceId);
  res.status(HTTP_STATUS.ok).json({ success: true, data: { accounts } });
};

export const getAccountByIdController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const account = await getAccountById(req.user.uid, req.params.id);
  res.status(HTTP_STATUS.ok).json({ success: true, data: { account } });
};

export const createAccountController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const parsed = createAccountSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  const account = await createAccountForUser(req.user.uid, parsed.data);
  res.status(HTTP_STATUS.created).json({ success: true, data: { account } });
};

export const updateAccountController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const parsed = updateAccountSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  const account = await updateAccountForUser(req.user.uid, req.params.id, parsed.data);
  res.status(HTTP_STATUS.ok).json({ success: true, data: { account } });
};

export const deleteAccountController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  await deleteAccountForUser(req.user.uid, req.params.id);
  res.status(HTTP_STATUS.ok).json({ success: true });
};

export const getAccountTotalsConvertedController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const workspaceId = req.query.workspaceId as string | undefined;
  const date = req.query.date as string | undefined;
  const result = await getAccountTotalsConverted(req.user.uid, workspaceId, date);
  res.status(HTTP_STATUS.ok).json({ success: true, data: result });
};

export const getAccountTransactionsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const transactions = await getTransactionsForAccount(
    req.user.uid,
    req.params.id,
    limit,
  );
  res
    .status(HTTP_STATUS.ok)
    .json({ success: true, data: { transactions } });
};

export const getAccountBalanceHistoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const history = await getBalanceHistoryForAccount(req.user.uid, req.params.id);
  res.status(HTTP_STATUS.ok).json({ success: true, data: { history } });
};

export const getWorkspaceBalanceHistoryController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const workspaceId = req.query.workspaceId as string | undefined;
  const history = await getWorkspaceBalanceHistory(req.user.uid, workspaceId);
  res.status(HTTP_STATUS.ok).json({ success: true, data: { history } });
};
