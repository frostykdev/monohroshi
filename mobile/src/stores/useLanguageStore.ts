import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ZustandStoreNames } from "@constants/zustand-store-names";
import type { SupportedLanguage } from "@i18n";

interface LanguageState {
  /** Explicitly chosen language. Null means "follow device locale". */
  language: SupportedLanguage | null;
  /** True once the AsyncStorage hydration has finished. */
  hasHydrated: boolean;
  setLanguage: (lang: SupportedLanguage) => void;
  _setHasHydrated: (v: boolean) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    immer((set) => ({
      language: null,
      hasHydrated: false,
      setLanguage: (lang) =>
        set((s) => {
          s.language = lang;
        }),
      _setHasHydrated: (v) =>
        set((s) => {
          s.hasHydrated = v;
        }),
    })),
    {
      name: ZustandStoreNames.LanguageStore,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);
