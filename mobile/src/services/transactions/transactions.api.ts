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
  translationKey: string | null;
};

export type TransactionTag = {
  id: string;
  name: string;
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
  tags: { tag: TransactionTag }[];
};

export type CreateTransactionPayload = {
  type: "expense" | "income" | "transfer";
  amount: string;
  /** Currency the amount was entered in. Omit when it matches the account's currency. */
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

export const createTransaction = async (
  payload: CreateTransactionPayload,
): Promise<Transaction> => {
  const res = await apiClient.post<ApiResponse<{ transaction: Transaction }>>(
    "/v1/transactions",
    payload,
  );
  return res.data.data.transaction;
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

export const fetchTransactionStats = async (
  workspaceId?: string | null,
  fromDate?: string,
  toDate?: string,
  accountIds?: string[],
): Promise<TransactionStats> => {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspaceId", workspaceId);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  if (accountIds && accountIds.length > 0)
    params.set("accountIds", accountIds.join(","));
  const res = await apiClient.get<ApiResponse<TransactionStats>>(
    `/v1/transactions/stats?${params.toString()}`,
  );
  return res.data.data;
};

export const fetchTransactionById = async (
  id: string,
): Promise<Transaction> => {
  const res = await apiClient.get<ApiResponse<{ transaction: Transaction }>>(
    `/v1/transactions/${id}`,
  );
  return res.data.data.transaction;
};

export type UpdateTransactionPayload = {
  type?: "expense" | "income" | "transfer";
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
  id: string,
  payload: UpdateTransactionPayload,
): Promise<Transaction> => {
  const res = await apiClient.patch<ApiResponse<{ transaction: Transaction }>>(
    `/v1/transactions/${id}`,
    payload,
  );
  return res.data.data.transaction;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await apiClient.delete(`/v1/transactions/${id}`);
};

export type FetchTransactionsParams = {
  workspaceId?: string | null;
  limit?: number;
  offset?: number;
  accountIds?: string[];
  categoryIds?: string[];
  tagIds?: string[];
  search?: string;
  fromDate?: string;
  toDate?: string;
};

export const fetchTransactions = async ({
  workspaceId,
  limit = 50,
  offset = 0,
  accountIds,
  categoryIds,
  tagIds,
  search,
  fromDate,
  toDate,
}: FetchTransactionsParams): Promise<Transaction[]> => {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspaceId", workspaceId);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (accountIds && accountIds.length > 0)
    params.set("accountIds", accountIds.join(","));
  if (categoryIds && categoryIds.length > 0)
    params.set("categoryIds", categoryIds.join(","));
  if (tagIds && tagIds.length > 0) params.set("tagIds", tagIds.join(","));
  if (search) params.set("search", search);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  const res = await apiClient.get<ApiResponse<{ transactions: Transaction[] }>>(
    `/v1/transactions?${params.toString()}`,
  );
  return res.data.data.transactions;
};
