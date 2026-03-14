import { apiClient } from "@services/api";

type ApiResponse<TData> = { success: boolean; data: TData };

export type BudgetCategory = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export type Budget = {
  id: string;
  amount: string;
  monthStart: string;
  workspaceId: string;
  categoryId: string | null;
  category: BudgetCategory | null;
  spent: number;
  remaining: number;
};

export type CreateBudgetPayload = {
  amount: string;
  categoryId?: string | null;
  workspaceId?: string;
  month?: string;
};

export type UpdateBudgetPayload = {
  amount?: string;
};

export const fetchBudgets = async (
  workspaceId?: string | null,
  month?: string,
): Promise<Budget[]> => {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspaceId", workspaceId);
  if (month) params.set("month", month);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiClient.get<ApiResponse<{ budgets: Budget[] }>>(
    `/v1/budgets${query}`,
  );
  return res.data.data.budgets;
};

export const createBudget = async (
  payload: CreateBudgetPayload,
): Promise<Budget> => {
  const res = await apiClient.post<ApiResponse<{ budget: Budget }>>(
    "/v1/budgets",
    payload,
  );
  return res.data.data.budget;
};

export const updateBudget = async (
  id: string,
  payload: UpdateBudgetPayload,
): Promise<Budget> => {
  const res = await apiClient.patch<ApiResponse<{ budget: Budget }>>(
    `/v1/budgets/${id}`,
    payload,
  );
  return res.data.data.budget;
};

export const deleteBudget = async (id: string): Promise<void> => {
  await apiClient.delete(`/v1/budgets/${id}`);
};
