import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { CustomerInfo, PurchasesOfferings } from "react-native-purchases";
import { ZustandStoreNames } from "@constants/zustand-store-names";
import { ENTITLEMENT_PRO } from "@services/revenuecat";

interface SubscriptionState {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  isProUser: boolean;
  setCustomerInfo: (customerInfo: CustomerInfo) => void;
  setOfferings: (offerings: PurchasesOfferings) => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  devtools(
    immer((set) => ({
      customerInfo: null,
      offerings: null,
      isProUser: false,

      setCustomerInfo: (customerInfo) =>
        set((state) => {
          state.customerInfo = customerInfo;
          state.isProUser = !!customerInfo.entitlements.active[ENTITLEMENT_PRO];
        }),

      setOfferings: (offerings) =>
        set((state) => {
          state.offerings = offerings;
        }),
    })),
    { name: ZustandStoreNames.SubscriptionStore },
  ),
);
