import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelWorkspaceInvitation,
  createWorkspace,
  deleteWorkspace,
  fetchAllWorkspaces,
  fetchCurrentWorkspace,
  fetchWorkspaceById,
  inviteWorkspaceMember,
  updateWorkspace,
  updateWorkspaceById,
  type CreateWorkspacePayload,
  type UpdateWorkspacePayload,
} from "./workspaces.api";

export const WORKSPACE_KEYS = {
  all: () => ["workspaces"] as const,
  current: () => ["workspace", "current"] as const,
  byId: (id: string) => ["workspace", id] as const,
  detail: (id?: string) =>
    id ? (["workspace", id] as const) : (["workspace", "current"] as const),
};

export const useAllWorkspaces = () =>
  useQuery({
    queryKey: WORKSPACE_KEYS.all(),
    queryFn: fetchAllWorkspaces,
  });

export const useWorkspace = (id?: string) =>
  useQuery({
    queryKey: WORKSPACE_KEYS.detail(id),
    queryFn: () => (id ? fetchWorkspaceById(id) : fetchCurrentWorkspace()),
  });

type UpdateWorkspaceMutationInput = UpdateWorkspacePayload & {
  workspaceId?: string;
};

export const useUpdateWorkspace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, ...payload }: UpdateWorkspaceMutationInput) =>
      workspaceId
        ? updateWorkspaceById(workspaceId, payload)
        : updateWorkspace(payload),
    onSuccess: (data) => {
      qc.setQueryData(WORKSPACE_KEYS.current(), data);
      qc.setQueryData(WORKSPACE_KEYS.byId(data.id), data);
      qc.invalidateQueries({ queryKey: WORKSPACE_KEYS.all() });
    },
  });
};

export const useInviteWorkspaceMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => inviteWorkspaceMember(email),
    onSuccess: () => {
      // Refresh workspace to show the new pending invite
      qc.invalidateQueries({ queryKey: ["workspace"] });
    },
  });
};

export const useCancelWorkspaceInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => cancelWorkspaceInvitation(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace"] });
    },
  });
};

export const useDeleteWorkspace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: WORKSPACE_KEYS.byId(id) });
      qc.invalidateQueries({ queryKey: WORKSPACE_KEYS.all() });
    },
  });
};

export const useCreateWorkspace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => createWorkspace(payload),
    onSuccess: (data) => {
      qc.setQueryData(WORKSPACE_KEYS.byId(data.id), data);
      qc.invalidateQueries({ queryKey: WORKSPACE_KEYS.all() });
    },
  });
};
