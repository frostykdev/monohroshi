import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { AppState } from "react-native";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "@react-native-firebase/auth";

const HomeLayout = () => {
  useEffect(() => {
    const auth = getAuth();

    const ensureAuthenticated = async () => {
      const user = auth.currentUser;

      if (!user) {
        router.replace("/(onboarding)/welcome");
        return;
      }

      try {
        await user.reload();
      } catch {
        await signOut(auth);
        router.replace("/(onboarding)/welcome");
      }
    };

    ensureAuthenticated();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/(onboarding)/welcome");
      }
    });

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        ensureAuthenticated();
      }
    });

    return () => {
      unsubscribeAuth();
      appStateSub.remove();
    };
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default HomeLayout;
