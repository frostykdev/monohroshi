import { apiClient } from "@services/api";

type ApiResponse<TData> = {
  success: boolean;
  data: TData;
};

export type WorkspaceMember = {
  id: string;
  name: string | null;
  email: string | null;
  role: "owner" | "member";
};

export type WorkspaceInvitation = {
  id: string;
  email: string;
  role: string;
};

export type Workspace = {
  id: string;
  name: string;
  currency: string;
  members: WorkspaceMember[];
  pendingInvitations: WorkspaceInvitation[];
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  currency: string;
  membersCount: number;
  role: "owner" | "admin" | "member";
};

export const fetchAllWorkspaces = async (): Promise<WorkspaceSummary[]> => {
  const response =
    await apiClient.get<ApiResponse<{ workspaces: WorkspaceSummary[] }>>(
      "/v1/workspaces",
    );
  return response.data.data.workspaces;
};

export const fetchCurrentWorkspace = async (): Promise<Workspace> => {
  const response = await apiClient.get<ApiResponse<{ workspace: Workspace }>>(
    "/v1/workspaces/current",
  );
  return response.data.data.workspace;
};

export const fetchWorkspaceById = async (id: string): Promise<Workspace> => {
  const response = await apiClient.get<ApiResponse<{ workspace: Workspace }>>(
    `/v1/workspaces/${id}`,
  );
  return response.data.data.workspace;
};

export type UpdateWorkspacePayload = {
  name?: string;
  currency?: string;
};

export const updateWorkspace = async (
  payload: UpdateWorkspacePayload,
): Promise<Workspace> => {
  const response = await apiClient.patch<ApiResponse<{ workspace: Workspace }>>(
    "/v1/workspaces/current",
    payload,
  );
  return response.data.data.workspace;
};

export const updateWorkspaceById = async (
  id: string,
  payload: UpdateWorkspacePayload,
): Promise<Workspace> => {
  const response = await apiClient.patch<ApiResponse<{ workspace: Workspace }>>(
    `/v1/workspaces/${id}`,
    payload,
  );
  return response.data.data.workspace;
};

export const inviteWorkspaceMember = async (email: string): Promise<void> => {
  await apiClient.post("/v1/workspaces/current/invites", { email });
};

export const cancelWorkspaceInvitation = async (
  inviteId: string,
): Promise<void> => {
  await apiClient.delete(`/v1/workspaces/current/invites/${inviteId}`);
};

export type CreateWorkspacePayload = {
  name: string;
  currency: string;
};

export const createWorkspace = async (
  payload: CreateWorkspacePayload,
): Promise<Workspace> => {
  const response = await apiClient.post<ApiResponse<{ workspace: Workspace }>>(
    "/v1/workspaces",
    payload,
  );
  return response.data.data.workspace;
};
