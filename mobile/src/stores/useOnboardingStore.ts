import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface OnboardingQuizAnswers {
  financialFeeling?: string;
  spendingOn: string[];
  savingFor: string[];
  habitEase?: string;
  goal?: string;
}

export interface InitialAccount {
  name: string;
  type: string;
  currency: string;
  balance: string;
  isPrimary: boolean;
}

interface OnboardingState {
  selectedCurrencyCode: string;
  setSelectedCurrencyCode: (code: string) => void;

  quizAnswers: OnboardingQuizAnswers;
  setQuizAnswer: (key: keyof OnboardingQuizAnswers, value: string) => void;

  initialAccount: InitialAccount;
  setInitialAccount: (account: InitialAccount) => void;

  reset: () => void;
}

const initialState = {
  selectedCurrencyCode: "UAH",
  quizAnswers: {
    spendingOn: [],
    savingFor: [],
  } as OnboardingQuizAnswers,
  initialAccount: {
    name: "",
    type: "bank_account",
    currency: "UAH",
    balance: "",
    isPrimary: true,
  } as InitialAccount,
};

export const useOnboardingStore = create<OnboardingState>()(
  immer((set) => ({
    ...initialState,

    setSelectedCurrencyCode: (code) => set({ selectedCurrencyCode: code }),

    setInitialAccount: (account) => set({ initialAccount: account }),

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
          (state.quizAnswers as Record<string, string>)[key] = value;
        }
      }),

    reset: () =>
      set((state) => {
        state.selectedCurrencyCode = initialState.selectedCurrencyCode;
        state.quizAnswers = { spendingOn: [], savingFor: [] };
        state.initialAccount = { ...initialState.initialAccount };
      }),
  })),
);
