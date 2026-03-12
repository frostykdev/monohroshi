import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ZustandStoreNames } from "@constants/zustand-store-names";

interface SetupState {
  completedSteps: string[];
  markStepComplete: (id: string) => void;
  reset: () => void;
}

const initialState = {
  completedSteps: [] as string[],
};

export const useSetupStore = create<SetupState>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      markStepComplete: (id) =>
        set((state) => {
          if (!get().completedSteps.includes(id)) {
            state.completedSteps.push(id);
          }
        }),

      reset: () => set({ completedSteps: [] }),
    })),
    {
      name: ZustandStoreNames.SetupStore,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
