import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAccount,
  deleteAccount,
  fetchAccountBalanceHistory,
  fetchAccountById,
  fetchAccounts,
  fetchAccountTotalsConverted,
  fetchAccountTransactions,
  fetchWorkspaceBalanceHistory,
  updateAccount,
  type CreateAccountPayload,
  type UpdateAccountPayload,
} from "./accounts.api";

export const ACCOUNT_KEYS = {
  all: () => ["accounts"] as const,
  byWorkspace: (workspaceId: string) => ["accounts", workspaceId] as const,
  byId: (id: string) => ["accounts", "detail", id] as const,
  transactions: (id: string) => ["accounts", "transactions", id] as const,
  balanceHistory: (id: string) => ["accounts", "balance-history", id] as const,
  workspaceBalanceHistory: (workspaceId?: string | null) =>
    [
      "accounts",
      "workspace-balance-history",
      workspaceId ?? "default",
    ] as const,
  totalsConverted: (workspaceId?: string | null) =>
    ["accounts", "totals-converted", workspaceId ?? "default"] as const,
};

export const useAccounts = (workspaceId?: string | null) =>
  useQuery({
    queryKey: workspaceId
      ? ACCOUNT_KEYS.byWorkspace(workspaceId)
      : ACCOUNT_KEYS.all(),
    queryFn: () => fetchAccounts(workspaceId),
    enabled: workspaceId !== undefined,
  });

export const useAccount = (id?: string | null) =>
  useQuery({
    queryKey: ACCOUNT_KEYS.byId(id!),
    queryFn: () => fetchAccountById(id!),
    enabled: !!id,
  });

export const useAccountTransactions = (accountId?: string | null) =>
  useQuery({
    queryKey: ACCOUNT_KEYS.transactions(accountId!),
    queryFn: () => fetchAccountTransactions(accountId!),
    enabled: !!accountId,
  });

export const useAccountBalanceHistory = (accountId?: string | null) =>
  useQuery({
    queryKey: ACCOUNT_KEYS.balanceHistory(accountId!),
    queryFn: () => fetchAccountBalanceHistory(accountId!),
    enabled: !!accountId,
  });

export const useWorkspaceBalanceHistory = (workspaceId?: string | null) =>
  useQuery({
    queryKey: ACCOUNT_KEYS.workspaceBalanceHistory(workspaceId),
    queryFn: () => fetchWorkspaceBalanceHistory(workspaceId),
    enabled: workspaceId !== undefined,
  });

export const useAccountTotalsConverted = (workspaceId?: string | null) =>
  useQuery({
    queryKey: ACCOUNT_KEYS.totalsConverted(workspaceId),
    queryFn: () => fetchAccountTotalsConverted(workspaceId),
    enabled: workspaceId !== undefined,
  });

export const useCreateAccount = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAccountPayload) => createAccount(payload),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: workspaceId
          ? ACCOUNT_KEYS.byWorkspace(workspaceId)
          : ACCOUNT_KEYS.all(),
      });
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.totalsConverted(workspaceId),
      });
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.workspaceBalanceHistory(workspaceId),
      });
      // Home screen cards/lists depend on transaction-derived queries.
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["transactions", "stats"] });
      qc.invalidateQueries({ queryKey: ["transactions", "recent"] });
    },
  });
};

export const useUpdateAccount = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateAccountPayload) =>
      updateAccount(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(ACCOUNT_KEYS.byId(data.id), data);
      // Also invalidate to force a fresh server fetch for the detail screen
      qc.invalidateQueries({ queryKey: ACCOUNT_KEYS.byId(data.id) });
      qc.invalidateQueries({
        queryKey: workspaceId
          ? ACCOUNT_KEYS.byWorkspace(workspaceId)
          : ACCOUNT_KEYS.all(),
      });
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.totalsConverted(workspaceId),
      });
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.workspaceBalanceHistory(workspaceId),
      });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["transactions", "stats"] });
      qc.invalidateQueries({ queryKey: ["transactions", "recent"] });
    },
  });
};

export const useDeleteAccount = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: ACCOUNT_KEYS.byId(id) });
      qc.invalidateQueries({
        queryKey: workspaceId
          ? ACCOUNT_KEYS.byWorkspace(workspaceId)
          : ACCOUNT_KEYS.all(),
      });
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.totalsConverted(workspaceId),
      });
      qc.invalidateQueries({
        queryKey: ACCOUNT_KEYS.workspaceBalanceHistory(workspaceId),
      });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["transactions", "stats"] });
      qc.invalidateQueries({ queryKey: ["transactions", "recent"] });
    },
  });
};
