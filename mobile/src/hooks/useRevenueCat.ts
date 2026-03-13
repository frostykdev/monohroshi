import { useEffect } from "react";
import { RevenueCatService } from "@services/revenuecat";
import { useSubscriptionStore } from "@stores/useSubscriptionStore";

export const useRevenueCat = () => {
  const { setCustomerInfo } = useSubscriptionStore();

  useEffect(() => {
    RevenueCatService.configure();

    const removeListener = RevenueCatService.addCustomerInfoListener(
      (customerInfo) => {
        setCustomerInfo(customerInfo);
      },
    );

    return removeListener;
  }, [setCustomerInfo]);
};
