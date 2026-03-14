import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBudget,
  deleteBudget,
  fetchBudgets,
  updateBudget,
  type CreateBudgetPayload,
  type UpdateBudgetPayload,
} from "./budgets.api";

export const BUDGET_KEYS = {
  all: () => ["budgets"] as const,
  byWorkspace: (workspaceId: string, month?: string) =>
    ["budgets", workspaceId, month ?? "current"] as const,
};

export const useBudgets = (workspaceId?: string | null, month?: string) =>
  useQuery({
    queryKey: workspaceId
      ? BUDGET_KEYS.byWorkspace(workspaceId, month)
      : BUDGET_KEYS.all(),
    queryFn: () => fetchBudgets(workspaceId, month),
    enabled: workspaceId !== undefined,
  });

export const useCreateBudget = (
  workspaceId?: string | null,
  month?: string,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBudgetPayload) => createBudget(payload),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: workspaceId
          ? BUDGET_KEYS.byWorkspace(workspaceId, month)
          : BUDGET_KEYS.all(),
      });
    },
  });
};

export const useUpdateBudget = (
  workspaceId?: string | null,
  month?: string,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateBudgetPayload) =>
      updateBudget(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: workspaceId
          ? BUDGET_KEYS.byWorkspace(workspaceId, month)
          : BUDGET_KEYS.all(),
      });
    },
  });
};

export const useDeleteBudget = (
  workspaceId?: string | null,
  month?: string,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: workspaceId
          ? BUDGET_KEYS.byWorkspace(workspaceId, month)
          : BUDGET_KEYS.all(),
      });
    },
  });
};
