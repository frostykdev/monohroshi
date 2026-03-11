import { apiClient } from "@services/api";

export type CurrentUser = {
  id: string;
  firebaseUid: string;
  email: string | null;
  name: string | null;
  onboarding: unknown;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<TData> = {
  success: boolean;
  data: TData;
};

export const fetchCurrentUser = async (): Promise<CurrentUser> => {
  const response = await apiClient.get<
    ApiResponse<{
      user: CurrentUser;
    }>
  >("/v1/me");

  return response.data.data.user;
};

export const completeOnboarding = async (payload: {
  onboarding: Record<string, unknown>;
}): Promise<CurrentUser> => {
  const response = await apiClient.post<
    ApiResponse<{
      user: CurrentUser;
    }>
  >("/v1/onboarding/complete", payload);

  return response.data.data.user;
};
