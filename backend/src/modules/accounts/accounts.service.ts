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
  icon: true,
  color: true,
  isPrimary: true,
  isArchived: true,
  sortOrder: true,
  balances: {
    select: { currency: true, balance: true },
    orderBy: { createdAt: "asc" as const },
  },
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
        icon: data.icon ?? null,
        color: data.color ?? null,
        isPrimary: data.isPrimary ?? false,
        workspaceId: wsId,
      },
      select: { id: true },
    });

    // Create the initial AccountBalance for this currency
    await tx.accountBalance.create({
      data: {
        accountId: account.id,
        currency: data.currency.toUpperCase(),
        balance: initialBalance,
      },
    });

    // Record the initial balance as a transaction
    await tx.transaction.create({
      data: {
        type: TRANSACTION_TYPES.INITIAL_BALANCE,
        amount: initialBalance,
        currency: data.currency.toUpperCase(),
        date: new Date(),
        accountId: account.id,
        createdById: user.id,
        workspaceId: wsId,
      },
    });

    // Use tx so the read sees the uncommitted writes in this transaction
    return tx.account.findUnique({
      where: { id: account.id },
      select: accountSelect,
    });
  });
};

export const updateAccountForUser = async (
  firebaseUid: string,
  accountId: string,
  data: {
    name?: string;
    type?: string;
    icon?: string | null;
    color?: string | null;
    isPrimary?: boolean;
    isArchived?: boolean;
    /** Updated currency balances. Each entry upserts the AccountBalance for that currency. */
    balances?: { currency: string; balance: string }[];
  },
) => {
  const user = await getUser(firebaseUid);
  await verifyAccountAccess(user.id, accountId);

  const accountMeta = await prisma.account.findUnique({
    where: { id: accountId },
    select: { workspaceId: true },
  });
  if (!accountMeta)
    throw new ApiError("Account not found", HTTP_STATUS.notFound);

  const updateData = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.type !== undefined && { type: data.type }),
    ...(data.icon !== undefined && { icon: data.icon }),
    ...(data.color !== undefined && { color: data.color }),
    ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
    ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
  };

  return prisma.$transaction(async (tx) => {
    // Update scalar fields
    if (Object.keys(updateData).length > 0) {
      await tx.account.update({
        where: { id: accountId },
        data: updateData,
      });
    }

    // Process balance updates
    if (data.balances && data.balances.length > 0) {
      for (const entry of data.balances) {
        const currency = entry.currency.toUpperCase();
        const newBalance = bnParse(entry.balance);

        const existing = await tx.accountBalance.findUnique({
          where: { accountId_currency: { accountId, currency } },
          select: { balance: true },
        });

        if (existing) {
          const oldBalance = bnParse(existing.balance);
          const delta = newBalance.minus(oldBalance);

          if (delta.abs().isGreaterThan("0.00001")) {
            await tx.transaction.create({
              data: {
                type: TRANSACTION_TYPES.BALANCE_CORRECTION,
                amount: bnRound(delta),
                currency,
                date: new Date(),
                accountId,
                createdById: user.id,
                workspaceId: accountMeta.workspaceId,
              },
            });

            await tx.accountBalance.update({
              where: { accountId_currency: { accountId, currency } },
              data: { balance: bnRound(newBalance) },
            });
          }
        } else {
          // New currency balance
          await tx.accountBalance.create({
            data: { accountId, currency, balance: bnRound(newBalance) },
          });

          await tx.transaction.create({
            data: {
              type: TRANSACTION_TYPES.INITIAL_BALANCE,
              amount: bnRound(newBalance),
              currency,
              date: new Date(),
              accountId,
              createdById: user.id,
              workspaceId: accountMeta.workspaceId,
            },
          });
        }
      }
    }

    // Use tx so the read sees the uncommitted writes in this transaction
    return tx.account.findUnique({
      where: { id: accountId },
      select: accountSelect,
    });
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
  /** Total balance in primary currency. Null when conversion failed. */
  totalInPrimary: number | null;
  /** Per-currency balances on this account. */
  balances: { currency: string; balance: number }[];
  primaryCurrency: string;
  conversionDate: string;
};

/**
 * Returns each account's total balance converted to the workspace's primary currency
 * by summing all AccountBalance rows.
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
    select: {
      id: true,
      name: true,
      balances: { select: { currency: true, balance: true } },
    },
  });

  await refreshDailyRates(primaryCurrency, conversionDate).catch(() => null);

  const results: ConvertedAccountTotal[] = await Promise.all(
    accounts.map(async (acc) => {
      const balances = acc.balances.map((b) => ({
        currency: b.currency,
        balance: bnParse(b.balance).toNumber(),
      }));

      let totalInPrimary: number | null = 0;
      for (const b of balances) {
        if (b.currency === primaryCurrency) {
          totalInPrimary = (totalInPrimary ?? 0) + b.balance;
        } else {
          try {
            const converted = await convertAmount(
              b.balance,
              b.currency,
              primaryCurrency,
              conversionDate,
            );
            totalInPrimary = (totalInPrimary ?? 0) + converted;
          } catch {
            totalInPrimary = null;
            break;
          }
        }
      }

      return {
        accountId: acc.id,
        accountName: acc.name,
        totalInPrimary:
          totalInPrimary !== null
            ? Math.round(totalInPrimary * 100) / 100
            : null,
        balances,
        primaryCurrency,
        conversionDate,
      };
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
 * Returns the end-of-month total balance (in workspace primary currency) for the account,
 * summed across all currency balances.
 *
 * For each currency, walks backwards through that currency's transactions.
 * Then converts all per-currency end-of-month balances to workspace currency.
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
    select: {
      id: true,
      workspaceId: true,
      balances: { select: { currency: true, balance: true } },
    },
  });
  if (!account) throw new ApiError("Account not found", HTTP_STATUS.notFound);

  const workspace = await prisma.workspace.findUnique({
    where: { id: account.workspaceId },
    select: { currency: true },
  });
  const primaryCurrency = workspace?.currency ?? "USD";

  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ accountId }, { destinationAccountId: accountId }] },
    orderBy: { date: "asc" },
    select: {
      type: true,
      amount: true,
      currency: true,
      destinationAmount: true,
      date: true,
      accountId: true,
      destinationAccountId: true,
    },
  });

  const toMonthKey = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  // Group transactions by (currency, month)
  const txByCurrencyAndMonth = new Map<
    string,
    Map<string, typeof transactions>
  >();

  for (const tx of transactions) {
    const currency = tx.currency;
    const monthKey = toMonthKey(new Date(tx.date));
    if (!txByCurrencyAndMonth.has(currency)) {
      txByCurrencyAndMonth.set(currency, new Map());
    }
    const monthMap = txByCurrencyAndMonth.get(currency)!;
    const existing = monthMap.get(monthKey) ?? [];
    existing.push(tx);
    monthMap.set(monthKey, existing);
  }

  const currentMonth = toMonthKey(new Date());

  // All distinct months across all currencies
  const allMonthsSet = new Set<string>([currentMonth]);
  for (const monthMap of txByCurrencyAndMonth.values()) {
    for (const m of monthMap.keys()) allMonthsSet.add(m);
  }
  const allMonths = [...allMonthsSet].sort();

  // Per-currency end-of-month balances map: currency → month → balance
  const perCurrencyHistory = new Map<string, Map<string, number>>();

  for (const b of account.balances) {
    const currency = b.currency;
    const monthMap = txByCurrencyAndMonth.get(currency) ?? new Map();
    const monthHistory = new Map<string, number>();

    let endBalance = bnParse(b.balance);

    for (let i = allMonths.length - 1; i >= 0; i--) {
      const month = allMonths[i];
      monthHistory.set(month, endBalance.toNumber());

      for (const tx of (monthMap.get(month) ?? []).reverse()) {
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
          endBalance = endBalance.minus(amount);
        }
      }
    }

    perCurrencyHistory.set(currency, monthHistory);
  }

  // Convert per-currency per-month to primary currency total
  const conversionDate = todayUTC();
  await refreshDailyRates(primaryCurrency, conversionDate).catch(() => null);

  const result: BalanceHistoryPoint[] = [];
  for (const month of allMonths) {
    let total = 0;
    for (const [currency, monthHistory] of perCurrencyHistory.entries()) {
      const bal = monthHistory.get(month) ?? 0;
      if (currency === primaryCurrency) {
        total += bal;
      } else {
        try {
          const converted = await convertAmount(
            bal,
            currency,
            primaryCurrency,
            conversionDate,
          );
          total += converted;
        } catch {
          total += bal; // fallback: add as-is
        }
      }
    }
    result.push({ month, balance: Math.round(total * 100) / 100 });
  }

  return result;
};

/**
 * Returns end-of-month total balance across all non-archived workspace accounts,
 * converted to workspace primary currency.
 */
export const getWorkspaceBalanceHistory = async (
  firebaseUid: string,
  workspaceId?: string | null,
): Promise<BalanceHistoryPoint[]> => {
  const user = await getUser(firebaseUid);
  const wsId = await resolveWorkspaceId(user.id, workspaceId ?? undefined);

  const workspace = await prisma.workspace.findUnique({
    where: { id: wsId },
    select: { currency: true },
  });
  const primaryCurrency = workspace?.currency ?? "USD";

  const accounts = await prisma.account.findMany({
    where: { workspaceId: wsId, isArchived: false },
    select: {
      id: true,
      balances: { select: { currency: true, balance: true } },
    },
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
      currency: true,
      destinationAmount: true,
      date: true,
      accountId: true,
      destinationAccountId: true,
    },
  });

  const toMonthKey = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  // Group transactions by month for the backwards walk
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

  // Current balance per account per currency
  const accountBalances = new Map<string, Map<string, ReturnType<typeof bnParse>>>();
  for (const acc of accounts) {
    const map = new Map<string, ReturnType<typeof bnParse>>();
    for (const b of acc.balances) {
      map.set(b.currency, bnParse(b.balance));
    }
    accountBalances.set(acc.id, map);
  }

  const conversionDate = todayUTC();
  await refreshDailyRates(primaryCurrency, conversionDate).catch(() => null);

  const getTotalInPrimary = async () => {
    let total = 0;
    for (const [, currencyMap] of accountBalances.entries()) {
      for (const [currency, balance] of currencyMap.entries()) {
        const bal = balance.toNumber();
        if (currency === primaryCurrency) {
          total += bal;
        } else {
          try {
            const c = await convertAmount(bal, currency, primaryCurrency, conversionDate);
            total += c;
          } catch {
            total += bal;
          }
        }
      }
    }
    return Math.round(total * 100) / 100;
  };

  const result: BalanceHistoryPoint[] = [];

  for (let i = allMonths.length - 1; i >= 0; i--) {
    const month = allMonths[i];
    const total = await getTotalInPrimary();
    result.unshift({ month, balance: total });

    // Walk backwards: undo each transaction in this month
    for (const tx of (txByMonth.get(month) ?? []).reverse()) {
      const srcInWs = accountIdSet.has(tx.accountId);
      const dstInWs =
        tx.destinationAccountId != null &&
        accountIdSet.has(tx.destinationAccountId);
      const currency = tx.currency;
      const txAmount = bnParse(tx.amount);

      if (tx.type === "expense" && srcInWs) {
        const map = accountBalances.get(tx.accountId)!;
        const cur = map.get(currency) ?? bn(0);
        map.set(currency, cur.plus(txAmount)); // undo expense (was deducted)
      } else if (tx.type === "income" && srcInWs) {
        const map = accountBalances.get(tx.accountId)!;
        const cur = map.get(currency) ?? bn(0);
        map.set(currency, cur.minus(txAmount)); // undo income (was added)
      } else if (tx.type === "transfer") {
        if (srcInWs && !dstInWs) {
          // undo source deduction
          const map = accountBalances.get(tx.accountId)!;
          const cur = map.get(currency) ?? bn(0);
          map.set(currency, cur.plus(txAmount));
        } else if (dstInWs && !srcInWs) {
          // undo destination credit
          const destAmt = tx.destinationAmount
            ? bnParse(tx.destinationAmount)
            : txAmount;
          const map = accountBalances.get(tx.destinationAccountId!)!;
          const cur = map.get(currency) ?? bn(0);
          map.set(currency, cur.minus(destAmt));
        }
        // internal transfer: net zero, skip
      } else if (
        (tx.type === TRANSACTION_TYPES.BALANCE_CORRECTION ||
          tx.type === TRANSACTION_TYPES.INITIAL_BALANCE) &&
        srcInWs
      ) {
        const map = accountBalances.get(tx.accountId)!;
        const cur = map.get(currency) ?? bn(0);
        map.set(currency, cur.minus(txAmount)); // signed, undo
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
      currency: true,
      destinationAmount: true,
      description: true,
      date: true,
      account: {
        select: { id: true, name: true, icon: true, color: true },
      },
      destinationAccount: {
        select: { id: true, name: true, icon: true, color: true },
      },
      category: {
        select: { id: true, name: true, icon: true, color: true, translationKey: true },
      },
    },
  });
};
