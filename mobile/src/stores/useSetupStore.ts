import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { ZustandStoreNames } from "@constants/zustand-store-names";

interface SetupState {
  completedSteps: string[];
  markStepComplete: (id: string) => void;

  isSetupComplete: boolean;
  completeSetup: () => void;
}

export const useSetupStore = create<SetupState>()(
  devtools(
    immer((set) => ({
      completedSteps: [],
      markStepComplete: (id) =>
        set((state) => {
          if (!state.completedSteps.includes(id)) {
            state.completedSteps.push(id);
          }
        }),

      isSetupComplete: false,
      completeSetup: () =>
        set((state) => {
          state.isSetupComplete = true;
        }),
    })),
    { name: ZustandStoreNames.SetupStore },
  ),
);
