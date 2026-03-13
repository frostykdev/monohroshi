import { apiClient } from "@services/api";

type ApiResponse<TData> = { success: boolean; data: TData };

export type Account = {
  id: string;
  name: string;
  type: string;
  balance: string;
  currency: string;
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
  destinationAmount: string | null;
  description: string | null;
  date: string;
  account: {
    id: string;
    name: string;
    currency: string;
    icon: string | null;
    color: string | null;
  };
  destinationAccount: {
    id: string;
    name: string;
    currency: string;
    icon: string | null;
    color: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
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
  currency?: string;
  balance?: string;
  icon?: string | null;
  color?: string | null;
  isPrimary?: boolean;
  isArchived?: boolean;
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

export const fetchAccountTransactions = async (
  accountId: string,
  limit = 50,
): Promise<AccountTransaction[]> => {
  const res = await apiClient.get<
    ApiResponse<{ transactions: AccountTransaction[] }>
  >(`/v1/accounts/${accountId}/transactions?limit=${limit}`);
  return res.data.data.transactions;
};
