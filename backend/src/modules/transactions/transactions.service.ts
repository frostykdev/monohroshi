import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import { TRANSACTION_TYPES } from "../../shared/constants";
import { convertAmount, todayUTC } from "../fx/fx.service";

const getUser = async (firebaseUid: string) => {
  const user = await prisma.user.findUnique({ where: { firebaseUid } });
  if (!user) throw new ApiError("User not found", HTTP_STATUS.notFound);
  return user;
};

const resolveWorkspaceId = async (userId: string, workspaceId?: string) => {
  if (workspaceId) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId },
      select: { workspaceId: true },
    });
    if (!membership)
      throw new ApiError("Workspace not found", HTTP_STATUS.notFound);
    return workspaceId;
  }
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  if (!membership)
    throw new ApiError("No workspace found", HTTP_STATUS.notFound);
  return membership.workspaceId;
};

export type CreateTransactionData = {
  type: string;
  amount: string;
  /** Currency the amount was entered in. If omitted, assumed to match the account's currency. */
  currency?: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  tagIds?: string[];
  description?: string;
  date: string;
  workspaceId?: string;
};

const transactionSelect = {
  id: true,
  type: true,
  amount: true,
  destinationAmount: true,
  description: true,
  date: true,
  createdAt: true,
  account: {
    select: { id: true, name: true, currency: true, icon: true, color: true },
  },
  destinationAccount: {
    select: { id: true, name: true, currency: true, icon: true, color: true },
  },
  category: {
    select: { id: true, name: true, icon: true, color: true, translationKey: true },
  },
  tags: {
    select: {
      tag: { select: { id: true, name: true, color: true } },
    },
  },
} as const;

export const createTransaction = async (
  firebaseUid: string,
  data: CreateTransactionData,
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, data.workspaceId);

  const account = await prisma.account.findFirst({
    where: { id: data.accountId, workspaceId: wsId },
    select: { id: true, balance: true, currency: true },
  });

  if (!account)
    throw new ApiError("Account not found", HTTP_STATUS.notFound);

  const validTypes = [
    TRANSACTION_TYPES.EXPENSE,
    TRANSACTION_TYPES.INCOME,
    TRANSACTION_TYPES.TRANSFER,
  ];
  if (!validTypes.includes(data.type as (typeof validTypes)[number])) {
    throw new ApiError("Invalid transaction type", HTTP_STATUS.badRequest);
  }

  let amount = parseFloat(data.amount);
  if (isNaN(amount) || amount <= 0)
    throw new ApiError("Amount must be positive", HTTP_STATUS.badRequest);

  // Convert to account's currency if entry currency differs
  const entryCurrency = data.currency?.toUpperCase();
  if (entryCurrency && entryCurrency !== account.currency) {
    const dateStr = new Date(data.date).toISOString().slice(0, 10) || todayUTC();
    amount = await convertAmount(amount, entryCurrency, account.currency, dateStr);
  }

  const txDate = new Date(data.date);
  if (isNaN(txDate.getTime()))
    throw new ApiError("Invalid date", HTTP_STATUS.badRequest);

  // Validate tag IDs belong to this workspace
  if (data.tagIds && data.tagIds.length > 0) {
    const validTags = await prisma.tag.findMany({
      where: { id: { in: data.tagIds }, workspaceId: wsId },
      select: { id: true },
    });
    if (validTags.length !== data.tagIds.length) {
      throw new ApiError("One or more tags not found", HTTP_STATUS.badRequest);
    }
  }

  return prisma.$transaction(async (tx) => {
    const newTx = await tx.transaction.create({
      data: {
        type: data.type,
        amount: String(amount),
        destinationAmount: data.destinationAccountId ? String(amount) : null,
        description: data.description ?? null,
        date: txDate,
        accountId: data.accountId,
        destinationAccountId: data.destinationAccountId ?? null,
        categoryId: data.categoryId ?? null,
        createdById: user.id,
        workspaceId: wsId,
        tags:
          data.tagIds && data.tagIds.length > 0
            ? {
                create: data.tagIds.map((tagId) => ({ tagId })),
              }
            : undefined,
      },
      select: transactionSelect,
    });

    // Update account balances
    const currentBalance = parseFloat(account.balance.toString());
    let newBalance: number;

    if (data.type === TRANSACTION_TYPES.EXPENSE) {
      newBalance = currentBalance - amount;
    } else if (data.type === TRANSACTION_TYPES.INCOME) {
      newBalance = currentBalance + amount;
    } else {
      // transfer: deduct from source
      newBalance = currentBalance - amount;
    }

    await tx.account.update({
      where: { id: data.accountId },
      data: { balance: String(newBalance) },
    });

    // For transfer: add to destination
    if (data.type === TRANSACTION_TYPES.TRANSFER && data.destinationAccountId) {
      const destAccount = await tx.account.findFirst({
        where: { id: data.destinationAccountId, workspaceId: wsId },
        select: { id: true, balance: true },
      });
      if (!destAccount)
        throw new ApiError("Destination account not found", HTTP_STATUS.notFound);

      const destBalance = parseFloat(destAccount.balance.toString());
      await tx.account.update({
        where: { id: data.destinationAccountId },
        data: { balance: String(destBalance + amount) },
      });
    }

    return newTx;
  });
};

export const getTransactions = async (
  firebaseUid: string,
  workspaceId?: string,
  limit = 50,
  offset = 0,
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId);

  return prisma.transaction.findMany({
    where: { workspaceId: wsId },
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
    select: transactionSelect,
  });
};

export type CategoryStat = {
  categoryId: string | null;
  categoryName: string | null;
  categoryTranslationKey: string | null;
  icon: string | null;
  color: string | null;
  total: number;
  count: number;
  percent: number;
};

export type TagStat = {
  tagId: string;
  tagName: string;
  color: string | null;
  total: number;
  count: number;
  percent: number;
};

export type TypeStats = {
  total: number;
  count: number;
  byCategory: CategoryStat[];
  byTag: TagStat[];
};

export type TransactionStats = {
  expenses: TypeStats;
  income: TypeStats;
  currency: string;
};

export const getTransactionStats = async (
  firebaseUid: string,
  workspaceId?: string,
  fromDate?: string,
  toDate?: string,
  accountIds?: string[],
): Promise<TransactionStats> => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId);

  const workspace = await prisma.workspace.findUnique({
    where: { id: wsId },
    select: { currency: true },
  });
  const currency = workspace?.currency ?? "USD";

  const from = fromDate ? new Date(fromDate) : undefined;
  const to = toDate ? new Date(`${toDate}T23:59:59.999Z`) : undefined;

  const dateCond = from || to
    ? {
        date: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      }
    : {};
  const accountCond =
    accountIds && accountIds.length > 0
      ? { accountId: { in: accountIds } }
      : {};

  const grouped = await prisma.transaction.groupBy({
    by: ["type", "categoryId"],
    where: {
      workspaceId: wsId,
      type: { in: ["expense", "income"] },
      ...dateCond,
      ...accountCond,
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  // Fetch category details for all referenced category IDs
  const catIds = [
    ...new Set(grouped.map((g) => g.categoryId).filter(Boolean)),
  ] as string[];
  const categories = await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true, icon: true, color: true, translationKey: true },
  });
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Fetch tag breakdown by querying transactions with tags
  const transactionsWithTags = await prisma.transaction.findMany({
    where: {
      workspaceId: wsId,
      type: { in: ["expense", "income"] },
      ...dateCond,
      ...accountCond,
      tags: { some: {} },
    },
    select: {
      type: true,
      amount: true,
      tags: {
        select: {
          tag: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  const buildResult = (type: "expense" | "income"): TypeStats => {
    const rows = grouped.filter((g) => g.type === type);
    const totalAmount = rows.reduce(
      (sum, r) => sum + parseFloat(((r._sum?.amount) ?? 0).toString()),
      0,
    );
    const count = rows.reduce((sum, r) => sum + (r._count?.id ?? 0), 0);

    const byCategory: CategoryStat[] = rows
      .map((r) => {
        const cat = r.categoryId ? catMap.get(r.categoryId) : null;
        const rowTotal = parseFloat(((r._sum?.amount) ?? 0).toString());
        return {
          categoryId: r.categoryId,
          categoryName: cat?.name ?? null,
          categoryTranslationKey: cat?.translationKey ?? null,
          icon: cat?.icon ?? null,
          color: cat?.color ?? null,
          total: Math.round(rowTotal * 100) / 100,
          count: r._count?.id ?? 0,
          percent:
            totalAmount > 0
              ? Math.round((rowTotal / totalAmount) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Aggregate tag stats for this type
    const tagAccumulator = new Map<
      string,
      { tag: { id: string; name: string; color: string | null }; total: number; count: number }
    >();
    for (const tx of transactionsWithTags) {
      if (tx.type !== type) continue;
      const amt = parseFloat(tx.amount.toString());
      for (const { tag } of tx.tags) {
        const existing = tagAccumulator.get(tag.id);
        if (existing) {
          existing.total += amt;
          existing.count += 1;
        } else {
          tagAccumulator.set(tag.id, { tag, total: amt, count: 1 });
        }
      }
    }

    const byTag: TagStat[] = Array.from(tagAccumulator.values())
      .map(({ tag, total, count: tagCount }) => ({
        tagId: tag.id,
        tagName: tag.name,
        color: tag.color,
        total: Math.round(total * 100) / 100,
        count: tagCount,
        percent: totalAmount > 0 ? Math.round((total / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      total: Math.round(totalAmount * 100) / 100,
      count,
      byCategory,
      byTag,
    };
  };

  return {
    expenses: buildResult("expense"),
    income: buildResult("income"),
    currency,
  };
};
