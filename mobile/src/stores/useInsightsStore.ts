import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ZustandStoreNames } from "@constants/zustand-store-names";
import type { InsightsAction } from "@services/insights/insights.api";

export type ChatMessageEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: InsightsAction[];
};

interface InsightsState {
  messages: ChatMessageEntry[];
  addMessage: (message: ChatMessageEntry) => void;
  clearMessages: () => void;
}

export const useInsightsStore = create<InsightsState>()(
  persist(
    immer((set) => ({
      messages: [],

      addMessage: (message) =>
        set((state) => {
          state.messages.push(message);
        }),

      clearMessages: () =>
        set((state) => {
          state.messages = [];
        }),
    })),
    {
      name: ZustandStoreNames.InsightsStore,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
