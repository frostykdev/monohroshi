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
  /** Currency the transaction is in. Stored as-is on the transaction and used to find/create AccountBalance. */
  currency?: string;
  accountId: string;
  destinationAccountId?: string;
  /** Override amount received at destination (same currency). Useful for fee differences. */
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
  currency: true,
  destinationAmount: true,
  description: true,
  date: true,
  createdAt: true,
  account: {
    select: { id: true, name: true, icon: true, color: true },
  },
  destinationAccount: {
    select: { id: true, name: true, icon: true, color: true },
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

/** Upsert an AccountBalance row, adjusting balance by `delta` (positive = increase, negative = decrease). */
const adjustAccountBalance = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  accountId: string,
  currency: string,
  delta: ReturnType<typeof bnParse>,
) => {
  const existing = await tx.accountBalance.findUnique({
    where: { accountId_currency: { accountId, currency } },
    select: { balance: true },
  });

  if (existing) {
    const newBalance = bnParse(existing.balance).plus(delta);
    await tx.accountBalance.update({
      where: { accountId_currency: { accountId, currency } },
      data: { balance: bnRound(newBalance) },
    });
  } else {
    // Create a new AccountBalance for this currency
    await tx.accountBalance.create({
      data: { accountId, currency, balance: bnRound(delta) },
    });
  }
};

export const createTransaction = async (
  firebaseUid: string,
  data: CreateTransactionData,
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, data.workspaceId);

  const account = await prisma.account.findFirst({
    where: { id: data.accountId, workspaceId: wsId },
    select: { id: true },
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

  // Use the provided currency; default to first balance currency if not specified
  const currency =
    data.currency?.toUpperCase() ??
    (
      await prisma.accountBalance.findFirst({
        where: { accountId: data.accountId },
        orderBy: { createdAt: "asc" },
        select: { currency: true },
      })
    )?.currency ??
    "USD";

  const txDate = new Date(data.date);
  if (isNaN(txDate.getTime()))
    throw new ApiError("Invalid date", HTTP_STATUS.badRequest);

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
        amount: bnRound(rawAmount),
        currency,
        destinationAmount: data.destinationAccountId
          ? bnRound(
              data.destinationAmount
                ? bnParse(data.destinationAmount).abs()
                : rawAmount,
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
            ? { create: data.tagIds.map((tagId) => ({ tagId })) }
            : undefined,
      },
      select: transactionSelect,
    });

    // Update source AccountBalance
    if (data.type === TRANSACTION_TYPES.INCOME) {
      await adjustAccountBalance(tx, data.accountId, currency, rawAmount);
    } else {
      // expense or transfer (deduct from source)
      await adjustAccountBalance(tx, data.accountId, currency, rawAmount.negated());
    }

    // For transfer: credit destination in the same currency
    if (data.type === TRANSACTION_TYPES.TRANSFER && data.destinationAccountId) {
      const destCredit = data.destinationAmount
        ? bnParse(data.destinationAmount).abs()
        : rawAmount;
      await adjustAccountBalance(tx, data.destinationAccountId, currency, destCredit);
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
      currency: true,
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
  const newCurrency = (data.currency ?? existing.currency).toUpperCase();

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
    const oldCurrency = existing.currency.toUpperCase();
    const oldAmount = bnParse(existing.amount);

    if (existing.type === TRANSACTION_TYPES.INCOME) {
      await adjustAccountBalance(tx, existing.accountId, oldCurrency, oldAmount.negated());
    } else {
      // expense or transfer source
      await adjustAccountBalance(tx, existing.accountId, oldCurrency, oldAmount);
    }

    if (
      existing.type === TRANSACTION_TYPES.TRANSFER &&
      existing.destinationAccountId
    ) {
      const oldDestAmount = existing.destinationAmount
        ? bnParse(existing.destinationAmount)
        : oldAmount;
      await adjustAccountBalance(tx, existing.destinationAccountId, oldCurrency, oldDestAmount.negated());
    }

    // ── Compute new amount ────────────────────────────────────────────────────
    let newAmount = data.amount ? bnParse(data.amount) : bnParse(existing.amount);
    if (newAmount.isLessThanOrEqualTo(0))
      throw new ApiError("Amount must be positive", HTTP_STATUS.badRequest);

    // ── Apply new balance effects ─────────────────────────────────────────────
    if (newType === TRANSACTION_TYPES.INCOME) {
      await adjustAccountBalance(tx, newAccountId, newCurrency, newAmount);
    } else {
      await adjustAccountBalance(tx, newAccountId, newCurrency, newAmount.negated());
    }

    const newDestAccountId =
      "destinationAccountId" in data
        ? data.destinationAccountId
        : existing.destinationAccountId;

    if (newType === TRANSACTION_TYPES.TRANSFER && newDestAccountId) {
      const newDestAmount =
        "destinationAmount" in data && data.destinationAmount
          ? bnParse(data.destinationAmount).abs()
          : newAmount;
      await adjustAccountBalance(tx, newDestAccountId, newCurrency, newDestAmount);
    }

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
        currency: newCurrency,
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
      currency: true,
      destinationAmount: true,
      accountId: true,
      destinationAccountId: true,
    },
  });
  if (!existing)
    throw new ApiError("Transaction not found", HTTP_STATUS.notFound);

  await prisma.$transaction(async (tx) => {
    const currency = existing.currency.toUpperCase();
    const amount = bnParse(existing.amount);

    // Revert source balance
    if (existing.type === TRANSACTION_TYPES.INCOME) {
      await adjustAccountBalance(tx, existing.accountId, currency, amount.negated());
    } else {
      await adjustAccountBalance(tx, existing.accountId, currency, amount);
    }

    // Revert destination balance for transfers
    if (
      existing.type === TRANSACTION_TYPES.TRANSFER &&
      existing.destinationAccountId
    ) {
      const destAmount = existing.destinationAmount
        ? bnParse(existing.destinationAmount)
        : amount;
      await adjustAccountBalance(tx, existing.destinationAccountId, currency, destAmount.negated());
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
              { category: { name: { contains: search, mode: "insensitive" } } },
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
  const primaryCurrency = workspace?.currency ?? "USD";

  const from = fromDate ? new Date(fromDate) : undefined;
  const to = toDate ? new Date(`${toDate}T23:59:59.999Z`) : undefined;

  const dateCond =
    from || to
      ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {};
  const accountCond =
    accountIds && accountIds.length > 0
      ? { accountId: { in: accountIds } }
      : {};

  // Group by (type, categoryId, currency) so we can convert each currency to primary
  const grouped = await prisma.transaction.groupBy({
    by: ["type", "categoryId", "currency"],
    where: {
      workspaceId: wsId,
      type: { in: ["expense", "income"] },
      ...dateCond,
      ...accountCond,
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  // Fetch category details
  const catIds = [
    ...new Set(grouped.map((g) => g.categoryId).filter(Boolean)),
  ] as string[];
  const categories = await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true, icon: true, color: true, translationKey: true },
  });
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Fetch transactions with tags (for tag stats)
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
      currency: true,
      tags: {
        select: { tag: { select: { id: true, name: true, color: true } } },
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
      currency: true,
      tags: {
        select: { tag: { select: { id: true, name: true, color: true } } },
      },
    },
  });

  const conversionDate = todayUTC();

  /** Convert an amount from `fromCurrency` to workspace primary, returning 0 on failure */
  const toPrimary = async (amount: number, fromCurrency: string) => {
    if (fromCurrency === primaryCurrency) return amount;
    try {
      return await convertAmount(amount, fromCurrency, primaryCurrency, conversionDate);
    } catch {
      return amount; // fallback: use raw
    }
  };

  const buildResult = async (type: "expense" | "income"): Promise<TypeStats> => {
    const rows = grouped.filter((g) => g.type === type);

    // Aggregate by categoryId, converting each currency group to primary currency
    const catTotals = new Map<
      string | null,
      { total: number; count: number }
    >();
    for (const row of rows) {
      const rawTotal = parseFloat(((row._sum?.amount) ?? 0).toString());
      const convertedTotal = await toPrimary(rawTotal, row.currency);
      const count = row._count?.id ?? 0;
      const key = row.categoryId ?? null;
      const existing = catTotals.get(key);
      if (existing) {
        existing.total += convertedTotal;
        existing.count += count;
      } else {
        catTotals.set(key, { total: convertedTotal, count });
      }
    }

    const byCategoryBase: CategoryStat[] = [];
    for (const [categoryId, { total, count }] of catTotals.entries()) {
      const cat = categoryId ? catMap.get(categoryId) : null;
      byCategoryBase.push({
        categoryId,
        categoryName: cat?.name ?? null,
        categoryTranslationKey: cat?.translationKey ?? null,
        icon: cat?.icon ?? null,
        color: cat?.color ?? null,
        total: Math.round(total * 100) / 100,
        count,
        percent: 0,
      });
    }

    // Balance corrections
    const correctionRows = correctionTransactions.filter((tx) =>
      type === "income"
        ? bnParse(tx.amount).isGreaterThan(0)
        : bnParse(tx.amount).isLessThan(0),
    );
    let correctionTotal = 0;
    for (const tx of correctionRows) {
      const rawAmt = bnParse(tx.amount).abs().toNumber();
      correctionTotal += await toPrimary(rawAmt, tx.currency);
    }
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

    // Tag aggregation (convert each tx's amount to primary)
    const tagAccumulator = new Map<
      string,
      { tag: { id: string; name: string; color: string | null }; total: number; count: number }
    >();
    for (const tx of transactionsWithTags) {
      if (tx.type !== type) continue;
      const amt = await toPrimary(parseFloat(tx.amount.toString()), tx.currency);
      for (const { tag } of tx.tags) {
        const ex = tagAccumulator.get(tag.id);
        if (ex) {
          ex.total += amt;
          ex.count += 1;
        } else {
          tagAccumulator.set(tag.id, { tag, total: amt, count: 1 });
        }
      }
    }
    for (const tx of correctionRows) {
      const amt = await toPrimary(bnParse(tx.amount).abs().toNumber(), tx.currency);
      for (const { tag } of tx.tags) {
        const ex = tagAccumulator.get(tag.id);
        if (ex) {
          ex.total += amt;
          ex.count += 1;
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

  const [expenses, income] = await Promise.all([
    buildResult("expense"),
    buildResult("income"),
  ]);

  return { expenses, income, currency: primaryCurrency };
};
