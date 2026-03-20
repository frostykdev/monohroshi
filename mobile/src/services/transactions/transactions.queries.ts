import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  createTransaction,
  deleteTransaction,
  fetchTransactionById,
  fetchTransactions,
  fetchTransactionStats,
  updateTransaction,
  type CreateTransactionPayload,
  type FetchTransactionsParams,
  type UpdateTransactionPayload,
} from "./transactions.api";
import { ACCOUNT_KEYS } from "@services/accounts/accounts.queries";

const PAGE_SIZE = 30;

export const TRANSACTION_KEYS = {
  all: () => ["transactions"] as const,
  byId: (id: string) => ["transactions", "detail", id] as const,
  byWorkspace: (workspaceId: string) => ["transactions", workspaceId] as const,
  infinite: (filters: Omit<FetchTransactionsParams, "limit" | "offset">) =>
    ["transactions", "infinite", filters] as const,
  stats: (
    workspaceId?: string | null,
    fromDate?: string,
    toDate?: string,
    accountIds?: string[],
  ) =>
    [
      "transactions",
      "stats",
      workspaceId ?? "default",
      fromDate ?? "",
      toDate ?? "",
      accountIds?.join(",") ?? "",
    ] as const,
  recent: (workspaceId?: string | null, accountIds?: string[]) =>
    [
      "transactions",
      "recent",
      workspaceId ?? "default",
      accountIds?.join(",") ?? "",
    ] as const,
};

export const useRecentTransactions = (
  workspaceId?: string | null,
  accountIds?: string[],
) =>
  useQuery({
    queryKey: TRANSACTION_KEYS.recent(workspaceId, accountIds),
    queryFn: () =>
      fetchTransactions({
        workspaceId,
        limit: 15,
        offset: 0,
        accountIds:
          accountIds && accountIds.length > 0 ? accountIds : undefined,
      }),
    enabled: workspaceId !== undefined,
  });

export const useInfiniteTransactions = (
  filters: Omit<FetchTransactionsParams, "limit" | "offset">,
) =>
  useInfiniteQuery({
    queryKey: TRANSACTION_KEYS.infinite(filters),
    queryFn: ({ pageParam }) =>
      fetchTransactions({ ...filters, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    enabled: filters.workspaceId !== undefined,
  });

export const useCreateTransaction = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransactionPayload) =>
      createTransaction(payload),
    onSuccess: (_data, payload) => {
      // Transactions list
      qc.invalidateQueries({
        queryKey: workspaceId
          ? TRANSACTION_KEYS.byWorkspace(workspaceId)
          : TRANSACTION_KEYS.all(),
      });
      // Also invalidate all transaction lists to avoid key drift during startup/hydration.
      qc.invalidateQueries({
        queryKey: TRANSACTION_KEYS.all(),
      });
      // Account list (balances updated)
      qc.invalidateQueries({
        queryKey: workspaceId
          ? ACCOUNT_KEYS.byWorkspace(workspaceId)
          : ACCOUNT_KEYS.all(),
      });
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.all(),
      });
      // Account detail (single account balance)
      qc.invalidateQueries({ queryKey: ACCOUNT_KEYS.byId(payload.accountId) });
      if (payload.destinationAccountId) {
        qc.invalidateQueries({
          queryKey: ACCOUNT_KEYS.byId(payload.destinationAccountId),
        });
      }
      // Per-account transaction history
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.transactions(payload.accountId),
      });
      if (payload.destinationAccountId) {
        qc.invalidateQueries({
          queryKey: ACCOUNT_KEYS.transactions(payload.destinationAccountId),
        });
      }
      // Converted totals (accounts screen summary row)
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.totalsConverted(workspaceId),
      });
      qc.invalidateQueries({
        queryKey: ["accounts", "totals-converted"],
      });
      // Balance dynamics chart/summary in accounts tab.
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.workspaceBalanceHistory(workspaceId),
      });
      qc.invalidateQueries({
        queryKey: ["accounts", "workspace-balance-history"],
      });
      // Stats
      qc.invalidateQueries({ queryKey: ["transactions", "stats"] });
      // Recent transactions (home screen)
      qc.invalidateQueries({ queryKey: ["transactions", "recent"] });
    },
  });
};

export const useTransaction = (id?: string | null) =>
  useQuery({
    queryKey: TRANSACTION_KEYS.byId(id!),
    queryFn: () => fetchTransactionById(id!),
    enabled: !!id,
  });

export const useUpdateTransaction = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: { id: string } & UpdateTransactionPayload) =>
      updateTransaction(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(TRANSACTION_KEYS.byId(data.id), data);
      qc.invalidateQueries({ queryKey: TRANSACTION_KEYS.all() });
      qc.invalidateQueries({ queryKey: ["transactions", "stats"] });
      qc.invalidateQueries({ queryKey: ["transactions", "recent"] });
      qc.invalidateQueries({
        queryKey: workspaceId
          ? ACCOUNT_KEYS.byWorkspace(workspaceId)
          : ACCOUNT_KEYS.all(),
      });
      qc.invalidateQueries({ queryKey: ACCOUNT_KEYS.all() });
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.transactions(data.account.id),
      });
      if (data.destinationAccount) {
        qc.invalidateQueries({
          queryKey: ACCOUNT_KEYS.transactions(data.destinationAccount.id),
        });
      }
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.totalsConverted(workspaceId),
      });
    },
  });
};

export const useDeleteTransaction = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: TRANSACTION_KEYS.byId(id) });
      qc.invalidateQueries({ queryKey: TRANSACTION_KEYS.all() });
      qc.invalidateQueries({ queryKey: ["transactions", "stats"] });
      qc.invalidateQueries({ queryKey: ["transactions", "recent"] });
      qc.invalidateQueries({
        queryKey: workspaceId
          ? ACCOUNT_KEYS.byWorkspace(workspaceId)
          : ACCOUNT_KEYS.all(),
      });
      qc.invalidateQueries({ queryKey: ACCOUNT_KEYS.all() });
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.totalsConverted(workspaceId),
      });
    },
  });
};

export const useTransactionStats = (
  workspaceId?: string | null,
  fromDate?: string,
  toDate?: string,
  accountIds?: string[],
) =>
  useQuery({
    queryKey: TRANSACTION_KEYS.stats(workspaceId, fromDate, toDate, accountIds),
    queryFn: () =>
      fetchTransactionStats(workspaceId, fromDate, toDate, accountIds),
    enabled: workspaceId !== undefined,
  });
