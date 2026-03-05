import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { ZustandStoreNames } from "@constants/zustand-store-names";
interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>()(
  devtools(
    immer((set) => ({
      count: 0,
      increment: () =>
        set((state) => {
          state.count += 1;
        }),
      decrement: () =>
        set((state) => {
          state.count -= 1;
        }),
      reset: () =>
        set((state) => {
          state.count = 0;
        }),
    })),
    { name: ZustandStoreNames.CounterStore },
  ),
);
