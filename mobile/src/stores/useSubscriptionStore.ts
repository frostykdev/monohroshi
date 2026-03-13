import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { CustomerInfo, PurchasesOfferings } from "react-native-purchases";
import { ENTITLEMENT_PRO } from "@services/revenuecat";

interface SubscriptionState {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  isProUser: boolean;
  setCustomerInfo: (customerInfo: CustomerInfo) => void;
  setOfferings: (offerings: PurchasesOfferings) => void;
}

const initialState = {
  customerInfo: null as CustomerInfo | null,
  offerings: null as PurchasesOfferings | null,
  isProUser: false,
};

export const useSubscriptionStore = create<SubscriptionState>()(
  immer((set) => ({
    ...initialState,

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
);
