import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import { TRANSACTION_TYPES } from "../../shared/constants";
import { convertAmount, todayUTC } from "../fx/fx.service";
import { bn, bnParse, bnRound } from "../../shared/bn";

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
  destinationAmount?: string;
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

  const rawAmount = bnParse(data.amount);
  if (rawAmount.isNaN() || rawAmount.isLessThanOrEqualTo(0))
    throw new ApiError("Amount must be positive", HTTP_STATUS.badRequest);

  // Convert to account's currency if entry currency differs
  const entryCurrency = data.currency?.toUpperCase();
  let amount = rawAmount;
  if (entryCurrency && entryCurrency !== account.currency) {
    const dateStr = new Date(data.date).toISOString().slice(0, 10) || todayUTC();
    const converted = await convertAmount(rawAmount.toNumber(), entryCurrency, account.currency, dateStr);
    amount = bn(converted);
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
        amount: bnRound(amount),
        destinationAmount: data.destinationAccountId
          ? bnRound(
              data.destinationAmount
                ? bnParse(data.destinationAmount).abs()
                : amount,
            )
          : null,
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
    const currentBalance = bnParse(account.balance);
    let newBalance =
      data.type === TRANSACTION_TYPES.INCOME
        ? currentBalance.plus(amount)
        : currentBalance.minus(amount); // expense or transfer (deduct from source)

    await tx.account.update({
      where: { id: data.accountId },
      data: { balance: bnRound(newBalance) },
    });

    // For transfer: add to destination
    if (data.type === TRANSACTION_TYPES.TRANSFER && data.destinationAccountId) {
      const destAccount = await tx.account.findFirst({
        where: { id: data.destinationAccountId, workspaceId: wsId },
        select: { id: true, balance: true },
      });
      if (!destAccount)
        throw new ApiError("Destination account not found", HTTP_STATUS.notFound);

      // Use the explicit destination amount when provided (cross-currency transfers),
      // otherwise mirror the source amount (same-currency transfers).
      const destCredit = data.destinationAmount
        ? bnParse(data.destinationAmount).abs()
        : amount;

      const destBalance = bnParse(destAccount.balance);
      await tx.account.update({
        where: { id: data.destinationAccountId },
        data: { balance: bnRound(destBalance.plus(destCredit)) },
      });
    }

    return newTx;
  });
};

export const getTransactionById = async (
  firebaseUid: string,
  transactionId: string,
) => {
  const user = await getUser(firebaseUid);
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      workspace: { members: { some: { userId: user.id } } },
    },
    select: transactionSelect,
  });
  if (!transaction)
    throw new ApiError("Transaction not found", HTTP_STATUS.notFound);
  return transaction;
};

export type UpdateTransactionData = {
  type?: string;
  amount?: string;
  currency?: string;
  accountId?: string;
  destinationAccountId?: string | null;
  destinationAmount?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  description?: string | null;
  date?: string;
};

export const updateTransaction = async (
  firebaseUid: string,
  transactionId: string,
  data: UpdateTransactionData,
) => {
  const user = await getUser(firebaseUid);

  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      workspace: { members: { some: { userId: user.id } } },
    },
    select: {
      id: true,
      type: true,
      amount: true,
      destinationAmount: true,
      accountId: true,
      destinationAccountId: true,
      workspaceId: true,
    },
  });
  if (!existing)
    throw new ApiError("Transaction not found", HTTP_STATUS.notFound);

  const newAccountId = data.accountId ?? existing.accountId;
  const newType = data.type ?? existing.type;

  // Validate tag IDs belong to this workspace
  if (data.tagIds && data.tagIds.length > 0) {
    const validTags = await prisma.tag.findMany({
      where: { id: { in: data.tagIds }, workspaceId: existing.workspaceId },
      select: { id: true },
    });
    if (validTags.length !== data.tagIds.length)
      throw new ApiError("One or more tags not found", HTTP_STATUS.badRequest);
  }

  return prisma.$transaction(async (tx) => {
    // ── Revert old balance effects ────────────────────────────────────────────
    const oldAccount = await tx.account.findUnique({
      where: { id: existing.accountId },
      select: { balance: true },
    });
    if (!oldAccount)
      throw new ApiError("Source account not found", HTTP_STATUS.notFound);

    const oldAmount = bnParse(existing.amount);
    const oldRevertedBalance =
      existing.type === TRANSACTION_TYPES.INCOME
        ? bnParse(oldAccount.balance).minus(oldAmount)
        : bnParse(oldAccount.balance).plus(oldAmount);

    await tx.account.update({
      where: { id: existing.accountId },
      data: { balance: bnRound(oldRevertedBalance) },
    });

    if (
      existing.type === TRANSACTION_TYPES.TRANSFER &&
      existing.destinationAccountId
    ) {
      const oldDest = await tx.account.findUnique({
        where: { id: existing.destinationAccountId },
        select: { balance: true },
      });
      if (oldDest) {
        const oldDestAmount = existing.destinationAmount
          ? bnParse(existing.destinationAmount)
          : oldAmount;
        await tx.account.update({
          where: { id: existing.destinationAccountId },
          data: {
            balance: bnRound(bnParse(oldDest.balance).minus(oldDestAmount)),
          },
        });
      }
    }

    // ── Compute new amount ────────────────────────────────────────────────────
    const newAccount = await tx.account.findFirst({
      where: { id: newAccountId, workspaceId: existing.workspaceId },
      select: { balance: true, currency: true },
    });
    if (!newAccount)
      throw new ApiError("Account not found", HTTP_STATUS.notFound);

    let newAmount = data.amount ? bnParse(data.amount) : bnParse(existing.amount);
    if (newAmount.isLessThanOrEqualTo(0))
      throw new ApiError("Amount must be positive", HTTP_STATUS.badRequest);

    if (data.amount && data.currency) {
      const entryCurrency = data.currency.toUpperCase();
      if (entryCurrency !== newAccount.currency) {
        const dateStr = data.date
          ? new Date(data.date).toISOString().slice(0, 10)
          : todayUTC();
        const converted = await convertAmount(
          newAmount.toNumber(),
          entryCurrency,
          newAccount.currency,
          dateStr,
        );
        newAmount = bn(converted);
      }
    }

    // ── Apply new balance effects ─────────────────────────────────────────────
    const srcNewBalance =
      newType === TRANSACTION_TYPES.INCOME
        ? bnParse(newAccount.balance).plus(newAmount)
        : bnParse(newAccount.balance).minus(newAmount);

    await tx.account.update({
      where: { id: newAccountId },
      data: { balance: bnRound(srcNewBalance) },
    });

    const newDestAccountId =
      "destinationAccountId" in data
        ? data.destinationAccountId
        : existing.destinationAccountId;

    if (newType === TRANSACTION_TYPES.TRANSFER && newDestAccountId) {
      const newDest = await tx.account.findFirst({
        where: { id: newDestAccountId, workspaceId: existing.workspaceId },
        select: { balance: true },
      });
      if (!newDest)
        throw new ApiError(
          "Destination account not found",
          HTTP_STATUS.notFound,
        );

      const newDestAmount =
        "destinationAmount" in data && data.destinationAmount
          ? bnParse(data.destinationAmount).abs()
          : newAmount;

      await tx.account.update({
        where: { id: newDestAccountId },
        data: {
          balance: bnRound(bnParse(newDest.balance).plus(newDestAmount)),
        },
      });
    }

    // ── Persist the updated transaction ──────────────────────────────────────
    const resolvedDestAmount =
      newType === TRANSACTION_TYPES.TRANSFER
        ? "destinationAmount" in data && data.destinationAmount !== undefined
          ? data.destinationAmount
            ? bnRound(bnParse(data.destinationAmount).abs())
            : null
          : existing.destinationAmount
            ? bnRound(bnParse(existing.destinationAmount))
            : null
        : null;

    const updated = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        type: newType,
        amount: bnRound(newAmount),
        destinationAmount: resolvedDestAmount,
        description:
          "description" in data ? (data.description ?? null) : undefined,
        date: data.date ? new Date(data.date) : undefined,
        accountId: newAccountId,
        destinationAccountId:
          "destinationAccountId" in data
            ? (data.destinationAccountId ?? null)
            : undefined,
        categoryId:
          "categoryId" in data ? (data.categoryId ?? null) : undefined,
        tags:
          data.tagIds !== undefined
            ? {
                deleteMany: {},
                ...(data.tagIds.length > 0
                  ? {
                      createMany: {
                        data: data.tagIds.map((tagId) => ({ tagId })),
                      },
                    }
                  : {}),
              }
            : undefined,
      },
      select: transactionSelect,
    });

    return updated;
  });
};

export const deleteTransaction = async (
  firebaseUid: string,
  transactionId: string,
) => {
  const user = await getUser(firebaseUid);

  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      workspace: { members: { some: { userId: user.id } } },
    },
    select: {
      id: true,
      type: true,
      amount: true,
      destinationAmount: true,
      accountId: true,
      destinationAccountId: true,
    },
  });
  if (!existing)
    throw new ApiError("Transaction not found", HTTP_STATUS.notFound);

  await prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: existing.accountId },
      select: { balance: true },
    });
    if (!account)
      throw new ApiError("Account not found", HTTP_STATUS.notFound);

    const amount = bnParse(existing.amount);
    const revertedBalance =
      existing.type === TRANSACTION_TYPES.INCOME
        ? bnParse(account.balance).minus(amount)
        : bnParse(account.balance).plus(amount);

    await tx.account.update({
      where: { id: existing.accountId },
      data: { balance: bnRound(revertedBalance) },
    });

    if (
      existing.type === TRANSACTION_TYPES.TRANSFER &&
      existing.destinationAccountId
    ) {
      const destAccount = await tx.account.findUnique({
        where: { id: existing.destinationAccountId },
        select: { balance: true },
      });
      if (destAccount) {
        const destAmount = existing.destinationAmount
          ? bnParse(existing.destinationAmount)
          : amount;
        await tx.account.update({
          where: { id: existing.destinationAccountId },
          data: {
            balance: bnRound(bnParse(destAccount.balance).minus(destAmount)),
          },
        });
      }
    }

    await tx.transaction.delete({ where: { id: existing.id } });
  });
};

export const getTransactions = async (
  firebaseUid: string,
  workspaceId?: string,
  limit = 50,
  offset = 0,
  accountIds?: string[],
  categoryIds?: string[],
  tagIds?: string[],
  search?: string,
  fromDate?: string,
  toDate?: string,
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId);

  const from = fromDate ? new Date(fromDate) : undefined;
  const to = toDate ? new Date(`${toDate}T23:59:59.999Z`) : undefined;

  // Resolve special virtual category values:
  //   "__uncategorized__"  → transactions with no categoryId
  //   "balance_correction" → balance_correction type transactions
  const wantsUncategorized = categoryIds?.includes("__uncategorized__");
  const wantsBalanceCorrection = categoryIds?.includes("balance_correction");
  const realCategoryIds = categoryIds?.filter(
    (id) => id !== "__uncategorized__" && id !== "balance_correction",
  );

  const buildCategoryCondition = () => {
    const conditions: object[] = [];

    if (realCategoryIds && realCategoryIds.length > 0) {
      conditions.push({ categoryId: { in: realCategoryIds } });
    }
    if (wantsUncategorized) {
      conditions.push({
        categoryId: null,
        type: { in: [TRANSACTION_TYPES.EXPENSE, TRANSACTION_TYPES.INCOME] },
      });
    }
    if (wantsBalanceCorrection) {
      conditions.push({ type: TRANSACTION_TYPES.BALANCE_CORRECTION });
    }

    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];
    return { OR: conditions };
  };

  return prisma.transaction.findMany({
    where: {
      workspaceId: wsId,
      ...(accountIds && accountIds.length > 0
        ? { accountId: { in: accountIds } }
        : {}),
      ...(categoryIds && categoryIds.length > 0
        ? buildCategoryCondition()
        : {}),
      ...(tagIds && tagIds.length > 0
        ? { tags: { some: { tagId: { in: tagIds } } } }
        : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: "insensitive" } },
              {
                category: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
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

  const correctionTransactions = await prisma.transaction.findMany({
    where: {
      workspaceId: wsId,
      type: TRANSACTION_TYPES.BALANCE_CORRECTION,
      ...dateCond,
      ...accountCond,
    },
    select: {
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
    const byCategoryBase: CategoryStat[] = rows.map((r) => {
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
        percent: 0,
      };
    });

    const correctionRows = correctionTransactions.filter((tx) =>
      type === "income"
        ? bnParse(tx.amount).isGreaterThan(0)
        : bnParse(tx.amount).isLessThan(0),
    );
    const correctionTotal = correctionRows.reduce(
      (sum, tx) => sum + bnParse(tx.amount).abs().toNumber(),
      0,
    );
    const correctionCount = correctionRows.length;

    const byCategory: CategoryStat[] = [...byCategoryBase];
    if (correctionCount > 0) {
      byCategory.push({
        categoryId: "balance_correction",
        categoryName: "Balance correction",
        categoryTranslationKey: "addTransaction.balanceCorrection",
        icon: "scale-outline",
        color: null,
        total: Math.round(correctionTotal * 100) / 100,
        count: correctionCount,
        percent: 0,
      });
    }

    const totalAmount = byCategory.reduce((sum, r) => sum + r.total, 0);
    const count = byCategory.reduce((sum, r) => sum + r.count, 0);
    const byCategoryWithPercent = byCategory
      .map((r) => ({
        ...r,
        percent: totalAmount > 0 ? Math.round((r.total / totalAmount) * 100) : 0,
      }))
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
    for (const tx of correctionRows) {
      const amt = bnParse(tx.amount).abs().toNumber();
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
      byCategory: byCategoryWithPercent,
      byTag,
    };
  };

  return {
    expenses: buildResult("expense"),
    income: buildResult("income"),
    currency,
  };
};
