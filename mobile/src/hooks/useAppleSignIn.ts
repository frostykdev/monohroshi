import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { signInWithApple } from "@services/auth";
import { isApiError } from "@services/api";
import { useCheckCurrentUser } from "@services/users/users.queries";

type AuthMode = "signin" | "signup";

export const useAppleSignIn = (mode: AuthMode, onSuccess: () => void) => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const checkCurrentUserMutation = useCheckCurrentUser();

  const handleSignIn = useCallback(async () => {
    setLoading(true);
    try {
      await signInWithApple();

      if (mode === "signin") {
        await checkCurrentUserMutation.mutateAsync();
      }

      onSuccess();
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      // User dismissed the native Apple sign-in sheet — silent
      if (code === "ERR_CANCELED") return;

      if (isApiError(error) && error.status === 403) {
        await signOut(getAuth());
        Alert.alert(
          t("onboarding.auth.errors.accountNotFoundTitle"),
          t("onboarding.auth.errors.accountNotFoundSubtitle"),
        );
        return;
      }

      Alert.alert(
        t("onboarding.auth.errors.signInFailedTitle"),
        t("onboarding.auth.errors.signInFailedSubtitle"),
      );
    } finally {
      setLoading(false);
    }
  }, [checkCurrentUserMutation, mode, onSuccess, t]);

  return { handleSignIn, loading };
};
