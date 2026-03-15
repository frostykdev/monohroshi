import { apiClient } from "@services/api";

type ApiResponse<TData> = { success: boolean; data: TData };

export type TransactionAccount = {
  id: string;
  name: string;
  currency: string;
  icon: string | null;
  color: string | null;
};

export type TransactionCategory = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export type Transaction = {
  id: string;
  type: string;
  amount: string;
  destinationAmount: string | null;
  description: string | null;
  date: string;
  createdAt: string;
  account: TransactionAccount;
  destinationAccount: TransactionAccount | null;
  category: TransactionCategory | null;
};

export type CreateTransactionPayload = {
  type: "expense" | "income" | "transfer";
  amount: string;
  /** Currency the amount was entered in. Omit when it matches the account's currency. */
  currency?: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  description?: string;
  date: string;
  workspaceId?: string;
};

export const createTransaction = async (
  payload: CreateTransactionPayload,
): Promise<Transaction> => {
  const res = await apiClient.post<ApiResponse<{ transaction: Transaction }>>(
    "/v1/transactions",
    payload,
  );
  return res.data.data.transaction;
};

export const fetchTransactions = async (
  workspaceId?: string | null,
  limit = 50,
  offset = 0,
): Promise<Transaction[]> => {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspaceId", workspaceId);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await apiClient.get<ApiResponse<{ transactions: Transaction[] }>>(
    `/v1/transactions?${params.toString()}`,
  );
  return res.data.data.transactions;
};
