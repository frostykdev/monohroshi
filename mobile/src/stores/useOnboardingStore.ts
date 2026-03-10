import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { ZustandStoreNames } from "@constants/zustand-store-names";

export interface OnboardingQuizAnswers {
  financialFeeling?: string;
  spendingOn: string[];
  savingFor: string[];
  habitEase?: string;
  goal?: string;
}

interface OnboardingState {
  selectedCurrencyCode: string;
  setSelectedCurrencyCode: (code: string) => void;

  quizAnswers: OnboardingQuizAnswers;
  setQuizAnswer: (key: keyof OnboardingQuizAnswers, value: string) => void;

  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  devtools(
    immer((set) => ({
      selectedCurrencyCode: "UAH",
      setSelectedCurrencyCode: (code) =>
        set((state) => {
          state.selectedCurrencyCode = code;
        }),

      quizAnswers: {
        spendingOn: [],
        savingFor: [],
      },
      setQuizAnswer: (key, value) =>
        set((state) => {
          const current = state.quizAnswers[key];
          if (Array.isArray(current)) {
            const idx = current.indexOf(value);
            if (idx >= 0) {
              current.splice(idx, 1);
            } else {
              current.push(value);
            }
          } else {
            (state.quizAnswers as unknown as Record<string, string>)[key] =
              value;
          }
        }),

      reset: () =>
        set((state) => {
          state.selectedCurrencyCode = "UAH";
          state.quizAnswers = { spendingOn: [], savingFor: [] };
        }),
    })),
    { name: ZustandStoreNames.OnboardingStore },
  ),
);
