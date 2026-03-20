import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTag,
  deleteTag,
  fetchTags,
  updateTag,
  type CreateTagPayload,
  type UpdateTagPayload,
} from "./tags.api";

export const TAG_KEYS = {
  all: () => ["tags"] as const,
  byWorkspace: (workspaceId: string) => ["tags", workspaceId] as const,
};

export const useTags = (workspaceId?: string | null) =>
  useQuery({
    queryKey: workspaceId ? TAG_KEYS.byWorkspace(workspaceId) : TAG_KEYS.all(),
    queryFn: () => fetchTags(workspaceId ?? undefined),
    enabled: workspaceId !== undefined,
  });

export const useCreateTag = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTagPayload) => createTag(payload),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: workspaceId
          ? TAG_KEYS.byWorkspace(workspaceId)
          : TAG_KEYS.all(),
      });
    },
  });
};

export const useUpdateTag = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateTagPayload) =>
      updateTag(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: workspaceId
          ? TAG_KEYS.byWorkspace(workspaceId)
          : TAG_KEYS.all(),
      });
    },
  });
};

export const useDeleteTag = (workspaceId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: workspaceId
          ? TAG_KEYS.byWorkspace(workspaceId)
          : TAG_KEYS.all(),
      });
    },
  });
};
