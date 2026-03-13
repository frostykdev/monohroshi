import { useEffect, useRef } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "@react-native-firebase/auth";
import { router } from "expo-router";
import { RevenueCatService } from "@services/revenuecat";
import { useSubscriptionStore } from "@stores/useSubscriptionStore";

export const useAuthListener = () => {
  const { setCustomerInfo } = useSubscriptionStore();
  const initialFired = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
      if (!initialFired.current) {
        initialFired.current = true;
        return;
      }

      if (user) {
        try {
          await user.reload();
        } catch {
          await signOut(getAuth());
          router.replace("/(onboarding)/welcome");
          return;
        }

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
  }, [setCustomerInfo]);
};
