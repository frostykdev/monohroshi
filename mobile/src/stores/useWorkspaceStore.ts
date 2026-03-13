import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ZustandStoreNames } from "@constants/zustand-store-names";
import type { WorkspaceSummary } from "@services/workspace-api";

interface WorkspaceState {
  // Active workspace (shown in settings row, used as default)
  id: string | null;
  name: string;
  // Full list of workspaces the user belongs to
  workspaces: WorkspaceSummary[];
  setWorkspace: (id: string, name: string) => void;
  setName: (name: string) => void;
  setWorkspaces: (workspaces: WorkspaceSummary[]) => void;
  reset: () => void;
}

const initialState = {
  id: null as string | null,
  name: "Personal",
  workspaces: [] as WorkspaceSummary[],
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    immer((set) => ({
      ...initialState,

      setWorkspace: (id, name) =>
        set((state) => {
          state.id = id;
          state.name = name;
        }),

      setName: (name) =>
        set((state) => {
          state.name = name;
        }),

      setWorkspaces: (workspaces) =>
        set((state) => {
          state.workspaces = workspaces;
          // Keep active workspace in sync if it was renamed externally
          if (state.id) {
            const active = workspaces.find((w) => w.id === state.id);
            if (active) state.name = active.name;
          } else if (workspaces.length > 0) {
            state.id = workspaces[0].id;
            state.name = workspaces[0].name;
          }
        }),

      reset: () =>
        set((state) => {
          state.id = initialState.id;
          state.name = initialState.name;
          state.workspaces = initialState.workspaces;
        }),
    })),
    {
      name: ZustandStoreNames.WorkspaceStore,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
