import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CategoryItem,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@constants/default-categories";
import { DEFAULT_ICON, DEFAULT_ICON_COLOR } from "@constants/icon-list";
import { ZustandStoreNames } from "@constants/zustand-store-names";

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
  icon: string;
  color: string;
}

interface OnboardingState {
  isOnboardingComplete: boolean;
  setOnboardingComplete: (value: boolean) => void;

  selectedCurrencyCode: string;
  setSelectedCurrencyCode: (code: string) => void;

  quizAnswers: OnboardingQuizAnswers;
  setQuizAnswer: (key: keyof OnboardingQuizAnswers, value: string) => void;

  initialAccount: InitialAccount;
  setInitialAccount: (account: InitialAccount) => void;

  expenseCategories: CategoryItem[];
  incomeCategories: CategoryItem[];
  setExpenseCategories: (categories: CategoryItem[]) => void;
  setIncomeCategories: (categories: CategoryItem[]) => void;

  reset: () => void;
}

const initialState = {
  isOnboardingComplete: false,
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
    icon: DEFAULT_ICON,
    color: DEFAULT_ICON_COLOR,
  } as InitialAccount,
  expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
  incomeCategories: [...DEFAULT_INCOME_CATEGORIES],
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    immer((set) => ({
      ...initialState,

      setOnboardingComplete: (value) => set({ isOnboardingComplete: value }),

      setSelectedCurrencyCode: (code) => set({ selectedCurrencyCode: code }),

      setInitialAccount: (account) => set({ initialAccount: account }),

      setExpenseCategories: (cats) => set({ expenseCategories: cats }),
      setIncomeCategories: (cats) => set({ incomeCategories: cats }),

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
          state.expenseCategories = [...DEFAULT_EXPENSE_CATEGORIES];
          state.incomeCategories = [...DEFAULT_INCOME_CATEGORIES];
        }),
    })),
    {
      name: ZustandStoreNames.OnboardingStore,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
