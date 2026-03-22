import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { isErrorWithCode, signInWithGoogle, statusCodes } from "@services/auth";
import { isApiError } from "@services/api";
import { useCheckCurrentUser } from "@services/users/users.queries";

type AuthMode = "signin" | "signup";

export const useGoogleSignIn = (mode: AuthMode, onSuccess: () => void) => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const checkCurrentUserMutation = useCheckCurrentUser();

  const handleSignIn = useCallback(async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result === null) {
        return;
      }

      if (mode === "signin") {
        await checkCurrentUserMutation.mutateAsync();
      }

      onSuccess();
    } catch (error: unknown) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (error.code === statusCodes.IN_PROGRESS) return;
      }

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
