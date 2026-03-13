import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  reorderCategories,
  updateCategory,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from "./categories.api";

export const CATEGORY_KEYS = {
  all: () => ["categories"] as const,
  byWorkspace: (workspaceId: string) => ["categories", workspaceId] as const,
};

export const useCategories = (workspaceId?: string | null) =>
  useQuery({
    queryKey: workspaceId
      ? CATEGORY_KEYS.byWorkspace(workspaceId)
      : CATEGORY_KEYS.all(),
    queryFn: () => fetchCategories(workspaceId ?? undefined),
    enabled: workspaceId !== undefined,
  });

export const useCreateCategory = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => createCategory(payload),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: workspaceId
          ? CATEGORY_KEYS.byWorkspace(workspaceId)
          : CATEGORY_KEYS.all(),
      });
    },
  });
};

export const useUpdateCategory = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateCategoryPayload) =>
      updateCategory(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: workspaceId
          ? CATEGORY_KEYS.byWorkspace(workspaceId)
          : CATEGORY_KEYS.all(),
      });
    },
  });
};

export const useReorderCategories = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orders: { id: string; sortOrder: number }[]) =>
      reorderCategories(orders),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: workspaceId
          ? CATEGORY_KEYS.byWorkspace(workspaceId)
          : CATEGORY_KEYS.all(),
      });
    },
  });
};

export const useDeleteCategory = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: workspaceId
          ? CATEGORY_KEYS.byWorkspace(workspaceId)
          : CATEGORY_KEYS.all(),
      });
    },
  });
};
