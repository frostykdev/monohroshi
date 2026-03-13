import { useMutation, useQuery } from "@tanstack/react-query";
import {
  completeOnboarding,
  deleteAccount,
  fetchCurrentUser,
  type CompleteOnboardingPayload,
} from "./users.api";

export const USER_KEYS = {
  me: () => ["user", "me"] as const,
};

export const useCurrentUser = () =>
  useQuery({
    queryKey: USER_KEYS.me(),
    queryFn: fetchCurrentUser,
  });

/**
 * Used during sign-in to verify the user account exists on the backend.
 * Intentionally uses useMutation (not useQuery) so it can be triggered
 * imperatively as part of the auth flow.
 */
export const useCheckCurrentUser = () =>
  useMutation({
    mutationFn: fetchCurrentUser,
  });

export const useCompleteOnboarding = () =>
  useMutation({
    mutationFn: (payload: CompleteOnboardingPayload) =>
      completeOnboarding(payload),
  });

export const useDeleteAccount = () =>
  useMutation({
    mutationFn: deleteAccount,
  });
