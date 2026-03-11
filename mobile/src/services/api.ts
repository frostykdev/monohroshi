import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAuth } from "@react-native-firebase/auth";
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

const attachAuthToken = async (config: InternalAxiosRequestConfig) => {
  const token = await getAuth().currentUser?.getIdToken();

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
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const message = data?.message ?? error.message ?? "Request failed";

    return Promise.reject(new ApiError(message, status, data));
  },
);
