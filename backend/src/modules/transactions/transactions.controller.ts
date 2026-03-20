import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import {
  createTransaction,
  getTransactionById,
  getTransactions,
  getTransactionStats,
  updateTransaction,
  deleteTransaction,
} from "./transactions.service";

const createTransactionSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.string().trim().min(1),
  /** Currency the amount was entered in. Defaults to the account's currency. */
  currency: z.string().trim().toUpperCase().optional(),
  accountId: z.string().trim().min(1),
  destinationAccountId: z.string().trim().optional(),
  destinationAmount: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  tagIds: z.array(z.string().trim()).optional(),
  description: z.string().trim().max(500).optional(),
  date: z.string().trim().min(1),
  workspaceId: z.string().trim().optional(),
});

export const createTransactionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const parsed = createTransactionSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);

  const transaction = await createTransaction(req.user.uid, parsed.data);
  res.status(HTTP_STATUS.created).json({ success: true, data: { transaction } });
};

export const getTransactionsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const workspaceId = req.query.workspaceId as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
  const accountIdsRaw = req.query.accountIds as string | undefined;
  const accountIds = accountIdsRaw ? accountIdsRaw.split(",").filter(Boolean) : undefined;
  const categoryIdsRaw = req.query.categoryIds as string | undefined;
  const categoryIds = categoryIdsRaw ? categoryIdsRaw.split(",").filter(Boolean) : undefined;
  const tagIdsRaw = req.query.tagIds as string | undefined;
  const tagIds = tagIdsRaw ? tagIdsRaw.split(",").filter(Boolean) : undefined;
  const search = req.query.search as string | undefined;
  const fromDate = req.query.fromDate as string | undefined;
  const toDate = req.query.toDate as string | undefined;

  const transactions = await getTransactions(
    req.user.uid,
    workspaceId,
    limit,
    offset,
    accountIds,
    categoryIds,
    tagIds,
    search,
    fromDate,
    toDate,
  );
  res.status(HTTP_STATUS.ok).json({ success: true, data: { transactions } });
};

export const getTransactionByIdController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const transaction = await getTransactionById(req.user.uid, req.params.id);
  res.status(HTTP_STATUS.ok).json({ success: true, data: { transaction } });
};

const updateTransactionSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]).optional(),
  amount: z.string().trim().min(1).optional(),
  currency: z.string().trim().toUpperCase().optional(),
  accountId: z.string().trim().optional(),
  destinationAccountId: z.string().trim().nullable().optional(),
  destinationAmount: z.string().trim().nullable().optional(),
  categoryId: z.string().trim().nullable().optional(),
  tagIds: z.array(z.string().trim()).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  date: z.string().trim().optional(),
});

export const updateTransactionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const parsed = updateTransactionSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ApiError("Invalid request body", HTTP_STATUS.badRequest);
  const transaction = await updateTransaction(
    req.user.uid,
    req.params.id,
    parsed.data,
  );
  res.status(HTTP_STATUS.ok).json({ success: true, data: { transaction } });
};

export const deleteTransactionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  await deleteTransaction(req.user.uid, req.params.id);
  res.status(HTTP_STATUS.ok).json({ success: true });
};

export const getTransactionStatsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new ApiError("Unauthorized", HTTP_STATUS.unauthorized);
  const workspaceId = req.query.workspaceId as string | undefined;
  const fromDate = req.query.fromDate as string | undefined;
  const toDate = req.query.toDate as string | undefined;
  const accountIdsRaw = req.query.accountIds as string | undefined;
  const accountIds = accountIdsRaw ? accountIdsRaw.split(",").filter(Boolean) : undefined;

  const stats = await getTransactionStats(
    req.user.uid,
    workspaceId,
    fromDate,
    toDate,
    accountIds,
  );
  res.status(HTTP_STATUS.ok).json({ success: true, data: stats });
};
