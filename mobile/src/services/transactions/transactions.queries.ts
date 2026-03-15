import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTransaction,
  fetchTransactions,
  type CreateTransactionPayload,
} from "./transactions.api";
import { ACCOUNT_KEYS } from "@services/accounts/accounts.queries";

export const TRANSACTION_KEYS = {
  all: () => ["transactions"] as const,
  byWorkspace: (workspaceId: string) => ["transactions", workspaceId] as const,
};

export const useTransactions = (
  workspaceId?: string | null,
  limit = 50,
  offset = 0,
) =>
  useQuery({
    queryKey: workspaceId
      ? TRANSACTION_KEYS.byWorkspace(workspaceId)
      : TRANSACTION_KEYS.all(),
    queryFn: () => fetchTransactions(workspaceId, limit, offset),
    enabled: workspaceId !== undefined,
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
      // Account list (balances updated)
      qc.invalidateQueries({
        queryKey: workspaceId
          ? ACCOUNT_KEYS.byWorkspace(workspaceId)
          : ACCOUNT_KEYS.all(),
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
    },
  });
};
