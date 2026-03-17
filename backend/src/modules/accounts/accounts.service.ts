import { prisma } from "../../lib/prisma";
import { ApiError } from "../../shared/errors/api-error";
import { HTTP_STATUS } from "../../shared/http-status";
import { TRANSACTION_TYPES } from "../../shared/constants";
import { convertAmount, refreshDailyRates, todayUTC } from "../fx/fx.service";
import { bn, bnParse, bnRound } from "../../shared/bn";

const accountSelect = {
  id: true,
  name: true,
  type: true,
  balance: true,
  currency: true,
  icon: true,
  color: true,
  isPrimary: true,
  isArchived: true,
  sortOrder: true,
} as const;

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

const verifyAccountAccess = async (userId: string, accountId: string) => {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      workspace: { members: { some: { userId } } },
    },
    select: { id: true },
  });
  if (!account) throw new ApiError("Account not found", HTTP_STATUS.notFound);
  return account;
};

export const getAccountsForWorkspace = async (
  firebaseUid: string,
  workspaceId?: string,
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId);

  return prisma.account.findMany({
    where: { workspaceId: wsId, isArchived: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: accountSelect,
  });
};

export const getAccountById = async (
  firebaseUid: string,
  accountId: string,
) => {
  const user = await getUser(firebaseUid);
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      workspace: { members: { some: { userId: user.id } } },
      isArchived: false,
    },
    select: accountSelect,
  });
  if (!account) throw new ApiError("Account not found", HTTP_STATUS.notFound);
  return account;
};

export const createAccountForUser = async (
  firebaseUid: string,
  data: {
    name: string;
    type: string;
    currency: string;
    balance?: string;
    icon?: string;
    color?: string;
    isPrimary?: boolean;
    workspaceId?: string;
  },
) => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, data.workspaceId);
  const initialBalance = data.balance ?? "0";

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        name: data.name,
        type: data.type,
        currency: data.currency,
        balance: initialBalance,
        icon: data.icon ?? null,
        color: data.color ?? null,
        isPrimary: data.isPrimary ?? false,
        workspaceId: wsId,
      },
      select: accountSelect,
    });

    await tx.transaction.create({
      data: {
        type: TRANSACTION_TYPES.INITIAL_BALANCE,
        // Store the signed initial balance (may be 0 or negative for debt accounts)
        amount: initialBalance,
        date: new Date(),
        accountId: account.id,
        createdById: user.id,
        workspaceId: wsId,
      },
    });

    return account;
  });
};

export const updateAccountForUser = async (
  firebaseUid: string,
  accountId: string,
  data: {
    name?: string;
    type?: string;
    currency?: string;
    balance?: string;
    icon?: string;
    color?: string;
    isPrimary?: boolean;
    isArchived?: boolean;
  },
) => {
  const user = await getUser(firebaseUid);
  await verifyAccountAccess(user.id, accountId);

  const updateData = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.type !== undefined && { type: data.type }),
    ...(data.currency !== undefined && { currency: data.currency }),
    ...(data.balance !== undefined && { balance: data.balance }),
    ...(data.icon !== undefined && { icon: data.icon }),
    ...(data.color !== undefined && { color: data.color }),
    ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
    ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
  };

  if (data.balance !== undefined) {
    const current = await prisma.account.findUnique({
      where: { id: accountId },
      select: { balance: true, workspaceId: true },
    });

    if (current) {
      const oldBalance = bnParse(current.balance);
      const newBalance = bnParse(data.balance);
      const delta = newBalance.minus(oldBalance);

      if (delta.abs().isGreaterThan("0.00001")) {
        return prisma.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              type: TRANSACTION_TYPES.BALANCE_CORRECTION,
              // Store signed delta: positive = balance went up, negative = went down.
              // This lets the history reconstruction correctly undo the correction.
              amount: bnRound(delta),
              date: new Date(),
              accountId,
              createdById: user.id,
              workspaceId: current.workspaceId,
            },
          });

          return tx.account.update({
            where: { id: accountId },
            data: updateData,
            select: accountSelect,
          });
        });
      }
    }
  }

  return prisma.account.update({
    where: { id: accountId },
    data: updateData,
    select: accountSelect,
  });
};

export const deleteAccountForUser = async (
  firebaseUid: string,
  accountId: string,
) => {
  const user = await getUser(firebaseUid);
  await verifyAccountAccess(user.id, accountId);
  await prisma.$transaction([
    prisma.transaction.deleteMany({
      where: {
        OR: [{ accountId }, { destinationAccountId: accountId }],
      },
    }),
    prisma.account.delete({ where: { id: accountId } }),
  ]);
};

export type ConvertedAccountTotal = {
  accountId: string;
  accountName: string;
  accountCurrency: string;
  balance: number;
  /** Balance expressed in the workspace primary currency. Null when conversion failed. */
  balanceInPrimary: number | null;
  /** True when FX conversion was actually performed (or currencies already matched). */
  converted: boolean;
  primaryCurrency: string;
  conversionDate: string;
};

/**
 * Returns each account's balance converted to the workspace's primary currency.
 * Accounts already in the primary currency are passed through without an FX lookup.
 * When FX rates are not yet persisted the raw balance is returned with a flag.
 */
export const getAccountTotalsConverted = async (
  firebaseUid: string,
  workspaceId?: string,
  dateStr?: string,
): Promise<{
  primaryCurrency: string;
  conversionDate: string;
  accounts: ConvertedAccountTotal[];
}> => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId);

  const workspace = await prisma.workspace.findUnique({
    where: { id: wsId },
    select: { currency: true },
  });

  if (!workspace) throw new ApiError("Workspace not found", HTTP_STATUS.notFound);

  const primaryCurrency = workspace.currency;
  const conversionDate = dateStr ?? todayUTC();

  const accounts = await prisma.account.findMany({
    where: { workspaceId: wsId, isArchived: false },
    select: { id: true, name: true, currency: true, balance: true },
  });

  // Pre-seed today's rates keyed by the primary currency so the snapshot is
  // always stored under the workspace currency (e.g. UAH) rather than a pivot.
  // Errors are swallowed — individual conversions will fail gracefully if needed.
  await refreshDailyRates(primaryCurrency, conversionDate).catch(() => null);

  const results: ConvertedAccountTotal[] = await Promise.all(
    accounts.map(async (acc) => {
      const balance = bnParse(acc.balance).toNumber();

      if (acc.currency === primaryCurrency) {
        return {
          accountId: acc.id,
          accountName: acc.name,
          accountCurrency: acc.currency,
          balance,
          balanceInPrimary: balance,
          converted: true,
          primaryCurrency,
          conversionDate,
        };
      }

      try {
        const balanceInPrimary = await convertAmount(
          balance,
          acc.currency,
          primaryCurrency,
          conversionDate,
        );
        return {
          accountId: acc.id,
          accountName: acc.name,
          accountCurrency: acc.currency,
          balance,
          balanceInPrimary,
          converted: true,
          primaryCurrency,
          conversionDate,
        };
      } catch {
        return {
          accountId: acc.id,
          accountName: acc.name,
          accountCurrency: acc.currency,
          balance,
          balanceInPrimary: null,
          converted: false,
          primaryCurrency,
          conversionDate,
        };
      }
    }),
  );

  return { primaryCurrency, conversionDate, accounts: results };
};

export type BalanceHistoryPoint = {
  /** "YYYY-MM" — e.g. "2026-03" */
  month: string;
  balance: number;
};

/**
 * Returns the end-of-month account balance for every calendar month that has
 * transaction activity, plus the current month.
 *
 * Algorithm:
 * 1. Group all transactions by "YYYY-MM" month key.
 * 2. Collect all distinct months (including the current one) and sort them.
 * 3. Walk backwards from the current balance:
 *    - Record current balance as the end-of-month balance for that month.
 *    - Undo all transactions in that month to arrive at the end-of-previous-month
 *      balance, then repeat.
 *
 * This ensures the most-recent data point always reflects the real current
 * balance (e.g. −265) rather than an intermediate reconstructed value.
 */
export const getBalanceHistoryForAccount = async (
  firebaseUid: string,
  accountId: string,
): Promise<BalanceHistoryPoint[]> => {
  const user = await getUser(firebaseUid);
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      workspace: { members: { some: { userId: user.id } } },
    },
    select: { id: true, balance: true },
  });
  if (!account) throw new ApiError("Account not found", HTTP_STATUS.notFound);

  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ accountId }, { destinationAccountId: accountId }] },
    orderBy: { date: "asc" },
    select: {
      type: true,
      amount: true,
      destinationAmount: true,
      date: true,
      accountId: true,
      destinationAccountId: true,
    },
  });

  const toMonthKey = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  // Group transactions by month
  const txByMonth = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const key = toMonthKey(new Date(tx.date));
    const existing = txByMonth.get(key) ?? [];
    existing.push(tx);
    txByMonth.set(key, existing);
  }

  // All distinct months (including current), sorted ascending
  const currentMonth = toMonthKey(new Date());
  const allMonths = [
    ...new Set([...txByMonth.keys(), currentMonth]),
  ].sort();

  // Walk backwards: for each month record end-of-month balance, then undo
  // that month's transactions to get the end-of-previous-month balance.
  let endBalance = bnParse(account.balance);
  const result: BalanceHistoryPoint[] = [];

  for (let i = allMonths.length - 1; i >= 0; i--) {
    const month = allMonths[i];
    result.unshift({ month, balance: endBalance.toNumber() });

    for (const tx of (txByMonth.get(month) ?? []).reverse()) {
      const isIncoming =
        tx.destinationAccountId === accountId && tx.type === "transfer";
      const amount =
        isIncoming && tx.destinationAmount
          ? bnParse(tx.destinationAmount)
          : bnParse(tx.amount);

      if (tx.type === "expense") endBalance = endBalance.plus(amount);
      else if (tx.type === "income") endBalance = endBalance.minus(amount);
      else if (tx.type === "transfer") {
        if (isIncoming) endBalance = endBalance.minus(amount);
        else endBalance = endBalance.plus(amount);
      } else if (
        tx.type === TRANSACTION_TYPES.BALANCE_CORRECTION ||
        tx.type === TRANSACTION_TYPES.INITIAL_BALANCE
      ) {
        // amount is stored as a signed value (positive = balance went up).
        // To reconstruct the prior balance, undo the signed effect.
        endBalance = endBalance.minus(amount);
      }
    }
  }

  return result;
};

/**
 * Returns end-of-month total balance across all non-archived workspace accounts.
 * Uses the same backwards-walking algorithm as getBalanceHistoryForAccount.
 */
export const getWorkspaceBalanceHistory = async (
  firebaseUid: string,
  workspaceId?: string | null,
): Promise<BalanceHistoryPoint[]> => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId ?? undefined);

  const accounts = await prisma.account.findMany({
    where: { workspaceId: wsId, isArchived: false },
    select: { id: true, balance: true },
  });

  if (accounts.length === 0) return [];

  const accountIds = accounts.map((a) => a.id);
  const accountIdSet = new Set(accountIds);

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { accountId: { in: accountIds } },
        { destinationAccountId: { in: accountIds } },
      ],
    },
    orderBy: { date: "asc" },
    select: {
      type: true,
      amount: true,
      destinationAmount: true,
      date: true,
      accountId: true,
      destinationAccountId: true,
    },
  });

  const toMonthKey = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const txByMonth = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const key = toMonthKey(new Date(tx.date));
    const existing = txByMonth.get(key) ?? [];
    existing.push(tx);
    txByMonth.set(key, existing);
  }

  const currentMonth = toMonthKey(new Date());
  const allMonths = [
    ...new Set([...txByMonth.keys(), currentMonth]),
  ].sort();

  let endBalance = accounts.reduce(
    (sum, a) => sum.plus(bnParse(a.balance)),
    bn(0),
  );

  const result: BalanceHistoryPoint[] = [];

  for (let i = allMonths.length - 1; i >= 0; i--) {
    const month = allMonths[i];
    result.unshift({ month, balance: endBalance.toNumber() });

    for (const tx of (txByMonth.get(month) ?? []).reverse()) {
      const srcInWs = accountIdSet.has(tx.accountId);
      const dstInWs =
        tx.destinationAccountId != null &&
        accountIdSet.has(tx.destinationAccountId);

      const txAmount = bnParse(tx.amount);
      if (tx.type === "expense") {
        endBalance = endBalance.plus(txAmount);
      } else if (tx.type === "income") {
        endBalance = endBalance.minus(txAmount);
      } else if (tx.type === "transfer") {
        if (srcInWs && dstInWs) {
          // internal transfer – net zero
        } else if (srcInWs) {
          endBalance = endBalance.plus(txAmount);
        } else if (dstInWs) {
          const destAmt = tx.destinationAmount
            ? bnParse(tx.destinationAmount)
            : txAmount;
          endBalance = endBalance.minus(destAmt);
        }
      } else if (
        tx.type === TRANSACTION_TYPES.BALANCE_CORRECTION ||
        tx.type === TRANSACTION_TYPES.INITIAL_BALANCE
      ) {
        endBalance = endBalance.minus(txAmount);
      }
    }
  }

  return result;
};

export const getTransactionsForAccount = async (
  firebaseUid: string,
  accountId: string,
  limit = 50,
) => {
  const user = await getUser(firebaseUid);
  await verifyAccountAccess(user.id, accountId);

  return prisma.transaction.findMany({
    where: {
      OR: [{ accountId }, { destinationAccountId: accountId }],
    },
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      amount: true,
      destinationAmount: true,
      description: true,
      date: true,
      account: {
        select: { id: true, name: true, currency: true, icon: true, color: true },
      },
      destinationAccount: {
        select: { id: true, name: true, currency: true, icon: true, color: true },
      },
      category: {
        select: { id: true, name: true, icon: true, color: true, translationKey: true },
      },
    },
  });
};
