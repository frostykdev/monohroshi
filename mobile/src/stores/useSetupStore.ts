import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface SetupState {
  completedSteps: string[];
  markStepComplete: (id: string) => void;

  isSetupComplete: boolean;
  completeSetup: () => void;
}

const initialState = {
  completedSteps: [] as string[],
  isSetupComplete: false,
};

export const useSetupStore = create<SetupState>()(
  immer((set, get) => ({
    ...initialState,

    markStepComplete: (id) =>
      set((state) => {
        if (!get().completedSteps.includes(id)) {
          state.completedSteps.push(id);
        }
      }),

    completeSetup: () => set({ isSetupComplete: true }),
  })),
);
