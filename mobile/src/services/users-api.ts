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

export type CompleteOnboardingPayload = {
  onboarding: Record<string, unknown>;
  workspace: {
    name: string;
    currency: string;
  };
  account: {
    name: string;
    type: string;
    currency: string;
    balance: string;
    isPrimary: boolean;
    icon?: string;
    color?: string;
  };
  categories: {
    name: string;
    type: string;
    icon: string;
    isSystem?: boolean;
    systemCode?: string;
  }[];
};

export const completeOnboarding = async (
  payload: CompleteOnboardingPayload,
): Promise<CurrentUser> => {
  const response = await apiClient.post<
    ApiResponse<{
      user: CurrentUser;
    }>
  >("/v1/onboarding/complete", payload);

  return response.data.data.user;
};
