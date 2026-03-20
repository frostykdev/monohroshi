import { apiClient } from "@services/api";

type ApiResponse<TData> = {
  success: boolean;
  data: TData;
};

export type Tag = {
  id: string;
  name: string;
  color: string | null;
};

export type CreateTagPayload = {
  name: string;
  color?: string;
  workspaceId?: string;
};

export type UpdateTagPayload = {
  name?: string;
  color?: string | null;
};

export const fetchTags = async (workspaceId?: string): Promise<Tag[]> => {
  const params = workspaceId ? `?workspaceId=${workspaceId}` : "";
  const response = await apiClient.get<ApiResponse<{ tags: Tag[] }>>(
    `/v1/tags${params}`,
  );
  return response.data.data.tags;
};

export const createTag = async (payload: CreateTagPayload): Promise<Tag> => {
  const response = await apiClient.post<ApiResponse<{ tag: Tag }>>(
    "/v1/tags",
    payload,
  );
  return response.data.data.tag;
};

export const updateTag = async (
  id: string,
  payload: UpdateTagPayload,
): Promise<Tag> => {
  const response = await apiClient.patch<ApiResponse<{ tag: Tag }>>(
    `/v1/tags/${id}`,
    payload,
  );
  return response.data.data.tag;
};

export const deleteTag = async (id: string): Promise<void> => {
  await apiClient.delete(`/v1/tags/${id}`);
};
