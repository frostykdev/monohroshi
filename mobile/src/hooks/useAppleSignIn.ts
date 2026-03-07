import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { signInWithApple } from "@services/auth";

export const useAppleSignIn = (onSuccess: () => void) => {
  const [loading, setLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    setLoading(true);
    try {
      await signInWithApple();
      onSuccess();
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      // User dismissed the native Apple sign-in sheet — silent
      if (code === "ERR_CANCELED") return;
      Alert.alert("Sign-in failed", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return { handleSignIn, loading };
};
