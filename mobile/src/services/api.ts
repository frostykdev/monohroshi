import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAuth, getIdToken, signOut } from "@react-native-firebase/auth";
import * as Burnt from "burnt";
import i18n from "@i18n";
import { env } from "@constants/env";

if (!env.apiUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is not configured");
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly data?: unknown;

  public constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};

type RetryConfig = InternalAxiosRequestConfig & { _isRetry?: boolean };

const attachAuthToken = async (config: InternalAxiosRequestConfig) => {
  const user = getAuth().currentUser;
  let token: string | null = null;
  try {
    token = user ? await getIdToken(user) : null;
  } catch (tokenError) {
    console.log("[API] Failed to get ID token:", tokenError);
  }

  console.log("[API] Request:", config.method?.toUpperCase(), config.url, {
    hasToken: !!token,
    hasUser: !!user,
  });

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(attachAuthToken);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const originalConfig = error.config as RetryConfig | undefined;

    console.log("[API] Response error:", {
      url: originalConfig?.url,
      method: originalConfig?.method,
      hasResponse: !!error.response,
      status: error.response?.status,
      errorCode: error.code,
      errorMessage: error.message,
      isRetry: originalConfig?._isRetry,
      currentUser: !!getAuth().currentUser,
    });

    // Network / timeout error — show snackbar, do not sign out
    if (!error.response) {
      console.log("[API] Network/timeout error — no response received");
      Burnt.toast({
        title: i18n.t("common.errors.networkError"),
        preset: "error",
      });
      return Promise.reject(new ApiError(error.message ?? "Network error", 0));
    }

    const status = error.response.status;
    const data = error.response.data;
    const message = data?.message ?? error.message ?? "Request failed";

    console.log("[API] HTTP error:", { status, message, data });

    // 401 — force-refresh Firebase token and retry once
    if (status === 401 && !originalConfig?._isRetry) {
      const user = getAuth().currentUser;
      console.log(
        "[API] 401 detected, attempting token refresh. User:",
        user?.uid,
      );
      if (user) {
        try {
          await getIdToken(user, true);
          console.log("[API] Token refreshed, retrying request");
          const retryConfig: RetryConfig = {
            ...originalConfig!,
            _isRetry: true,
          };
          return await apiClient(retryConfig);
        } catch (refreshError) {
          console.log("[API] Token refresh failed:", refreshError);
          // Token refresh failed — fall through to sign out
        }
      }
      console.log("[API] Signing out after 401");
      await signOut(getAuth());
      return Promise.reject(new ApiError(message, status, data));
    }

    return Promise.reject(new ApiError(message, status, data));
  },
);
