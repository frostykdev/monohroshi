import { apiClient } from "@services/api";

type ApiResponse<TData> = {
  success: boolean;
  data: TData;
};

export type Category = {
  id: string;
  name: string;
  type: "expense" | "income";
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  systemCode: string | null;
  sortOrder: number;
};

export type CreateCategoryPayload = {
  name: string;
  type: "expense" | "income";
  icon?: string;
  workspaceId?: string;
};

export const fetchCategories = async (
  workspaceId?: string,
): Promise<Category[]> => {
  const params = workspaceId ? `?workspaceId=${workspaceId}` : "";
  const response = await apiClient.get<ApiResponse<{ categories: Category[] }>>(
    `/v1/categories${params}`,
  );
  return response.data.data.categories;
};

export const createCategory = async (
  payload: CreateCategoryPayload,
): Promise<Category> => {
  const response = await apiClient.post<ApiResponse<{ category: Category }>>(
    "/v1/categories",
    payload,
  );
  return response.data.data.category;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await apiClient.delete(`/v1/categories/${id}`);
};
