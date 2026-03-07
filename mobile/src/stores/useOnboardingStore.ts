import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { ZustandStoreNames } from "@constants/zustand-store-names";

interface OnboardingState {
  selectedCurrencyCode: string;
  setSelectedCurrencyCode: (code: string) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  devtools(
    immer((set) => ({
      selectedCurrencyCode: "UAH",
      setSelectedCurrencyCode: (code) =>
        set((state) => {
          state.selectedCurrencyCode = code;
        }),
    })),
    { name: ZustandStoreNames.OnboardingStore },
  ),
);
