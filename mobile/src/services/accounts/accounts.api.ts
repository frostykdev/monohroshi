import { apiClient } from "@services/api";

type ApiResponse<TData> = { success: boolean; data: TData };

export type AccountBalance = {
  currency: string;
  balance: string;
};

export type Account = {
  id: string;
  name: string;
  type: string;
  balances: AccountBalance[];
  icon: string | null;
  color: string | null;
  isPrimary: boolean;
  isArchived: boolean;
  sortOrder: number;
};

export type AccountTransaction = {
  id: string;
  type: string;
  amount: string;
  currency: string;
  destinationAmount: string | null;
  description: string | null;
  date: string;
  account: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  };
  destinationAccount: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    translationKey: string | null;
  } | null;
};

export type CreateAccountPayload = {
  name: string;
  type: string;
  currency: string;
  balance?: string;
  icon?: string;
  color?: string;
  isPrimary?: boolean;
  workspaceId?: string;
};

export type UpdateAccountPayload = {
  name?: string;
  type?: string;
  icon?: string | null;
  color?: string | null;
  isPrimary?: boolean;
  isArchived?: boolean;
  balances?: { currency: string; balance: string }[];
};

export const fetchAccounts = async (
  workspaceId?: string | null,
): Promise<Account[]> => {
  const params = workspaceId ? `?workspaceId=${workspaceId}` : "";
  const res = await apiClient.get<ApiResponse<{ accounts: Account[] }>>(
    `/v1/accounts${params}`,
  );
  return res.data.data.accounts;
};

export const fetchAccountById = async (id: string): Promise<Account> => {
  const res = await apiClient.get<ApiResponse<{ account: Account }>>(
    `/v1/accounts/${id}`,
  );
  return res.data.data.account;
};

export const createAccount = async (
  payload: CreateAccountPayload,
): Promise<Account> => {
  const res = await apiClient.post<ApiResponse<{ account: Account }>>(
    "/v1/accounts",
    payload,
  );
  return res.data.data.account;
};

export const updateAccount = async (
  id: string,
  payload: UpdateAccountPayload,
): Promise<Account> => {
  const res = await apiClient.patch<ApiResponse<{ account: Account }>>(
    `/v1/accounts/${id}`,
    payload,
  );
  return res.data.data.account;
};

export const deleteAccount = async (id: string): Promise<void> => {
  await apiClient.delete(`/v1/accounts/${id}`);
};

export type ConvertedAccountTotal = {
  accountId: string;
  accountName: string;
  /** Total of all currency balances converted to workspace primary currency. Null if conversion failed. */
  totalInPrimary: number | null;
  /** Per-currency balances on this account. */
  balances: { currency: string; balance: number }[];
  primaryCurrency: string;
  conversionDate: string;
};

export type AccountTotalsConverted = {
  primaryCurrency: string;
  conversionDate: string;
  accounts: ConvertedAccountTotal[];
};

export const fetchAccountTotalsConverted = async (
  workspaceId?: string | null,
  date?: string,
): Promise<AccountTotalsConverted> => {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspaceId", workspaceId);
  if (date) params.set("date", date);
  const res = await apiClient.get<ApiResponse<AccountTotalsConverted>>(
    `/v1/accounts/totals-converted?${params.toString()}`,
  );
  return res.data.data;
};

export type BalanceHistoryPoint = {
  /** "YYYY-MM", e.g. "2026-03" */
  month: string;
  balance: number;
};

export const fetchWorkspaceBalanceHistory = async (
  workspaceId?: string | null,
): Promise<BalanceHistoryPoint[]> => {
  const params = workspaceId ? `?workspaceId=${workspaceId}` : "";
  const res = await apiClient.get<
    ApiResponse<{ history: BalanceHistoryPoint[] }>
  >(`/v1/accounts/workspace-balance-history${params}`);
  return res.data.data.history;
};

export const fetchAccountBalanceHistory = async (
  accountId: string,
): Promise<BalanceHistoryPoint[]> => {
  const res = await apiClient.get<
    ApiResponse<{ history: BalanceHistoryPoint[] }>
  >(`/v1/accounts/${accountId}/balance-history`);
  return res.data.data.history;
};

export const fetchAccountTransactions = async (
  accountId: string,
  limit = 50,
): Promise<AccountTransaction[]> => {
  const res = await apiClient.get<
    ApiResponse<{ transactions: AccountTransaction[] }>
  >(`/v1/accounts/${accountId}/transactions?limit=${limit}`);
  return res.data.data.transactions;
};
