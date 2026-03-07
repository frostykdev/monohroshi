import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { isErrorWithCode, signInWithGoogle, statusCodes } from "@services/auth";

export const useGoogleSignIn = (onSuccess: () => void) => {
  const [loading, setLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result !== null) onSuccess();
    } catch (error: unknown) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (error.code === statusCodes.IN_PROGRESS) return;
      }
      Alert.alert("Sign-in failed", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return { handleSignIn, loading };
};
