import { useEffect, useRef } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "@react-native-firebase/auth";
import { router } from "expo-router";
import { RevenueCatService } from "@services/revenuecat";
import { useSubscriptionStore } from "@stores/useSubscriptionStore";
import { useOnboardingStore } from "@stores/useOnboardingStore";

export const useAuthListener = () => {
  const { setCustomerInfo } = useSubscriptionStore();
  const { reset: resetOnboarding } = useOnboardingStore();
  const initialFired = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
      if (!initialFired.current) {
        // Skip the first emission — initial routing is handled by app/index.tsx
        initialFired.current = true;
        return;
      }

      if (user) {
        try {
          // Detect deleted/disabled Firebase users and force logout immediately.
          await user.reload();
        } catch {
          await signOut(getAuth());
          router.replace("/(onboarding)/welcome");
          return;
        }

        resetOnboarding();
        try {
          const customerInfo = await RevenueCatService.identifyUser(user.uid);
          setCustomerInfo(customerInfo);
        } catch {
          // Non-critical — app continues without RC user identification
        }
      } else {
        router.replace("/(onboarding)/welcome");
      }
    });

    return unsubscribe;
  }, [setCustomerInfo, resetOnboarding]);
};
