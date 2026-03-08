import { useEffect } from "react";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import { RevenueCatService } from "@services/revenuecat";
import { useSubscriptionStore } from "@stores/useSubscriptionStore";

export const useAuthListener = () => {
  const { setCustomerInfo } = useSubscriptionStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
      if (user) {
        try {
          const customerInfo = await RevenueCatService.identifyUser(user.uid);
          setCustomerInfo(customerInfo);
        } catch {
          // Non-critical — app continues without RC user identification
        }
      }
    });

    return unsubscribe;
  }, [setCustomerInfo]);
};
