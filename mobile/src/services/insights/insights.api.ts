import { apiClient } from "@services/api";

type ApiResponse<TData> = { success: boolean; data: TData };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type InsightsActionParams = {
  categoryId: string;
  categoryName: string;
  amount: string;
};

export type InsightsAction = {
  label: string;
  route?: string;
  isExecutable: boolean;
  actionKey: string;
  params: InsightsActionParams;
};

export type InsightsResponse = {
  reply: string;
  actions: InsightsAction[];
};

export type SendMessagePayload = {
  message: string;
  history: ChatMessage[];
  workspaceId?: string;
};

export const sendInsightsMessage = async (
  payload: SendMessagePayload,
): Promise<InsightsResponse> => {
  const res = await apiClient.post<ApiResponse<InsightsResponse>>(
    "/v1/insights/chat",
    payload,
  );
  return res.data.data;
};
