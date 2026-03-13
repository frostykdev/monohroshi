import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAccount,
  deleteAccount,
  fetchAccountById,
  fetchAccounts,
  fetchAccountTransactions,
  updateAccount,
  type CreateAccountPayload,
  type UpdateAccountPayload,
} from "./accounts.api";

export const ACCOUNT_KEYS = {
  all: () => ["accounts"] as const,
  byWorkspace: (workspaceId: string) => ["accounts", workspaceId] as const,
  byId: (id: string) => ["accounts", "detail", id] as const,
  transactions: (id: string) => ["accounts", "transactions", id] as const,
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
      qc.invalidateQueries({
        queryKey: workspaceId
          ? ACCOUNT_KEYS.byWorkspace(workspaceId)
          : ACCOUNT_KEYS.all(),
      });
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
    },
  });
};
