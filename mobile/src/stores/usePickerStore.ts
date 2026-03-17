import { create } from "zustand";

export type PickedTag = { id: string; name: string; color: string | null };

type PickerStore = {
  accountType: string | null;
  currency: string | null;
  icon: string | null;
  iconColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  selectedAccountIds: string[] | null;
  selectedTags: PickedTag[] | null;
  setAccountType: (v: string) => void;
  setCurrency: (v: string) => void;
  setIcon: (icon: string, color: string) => void;
  setCategory: (
    id: string,
    name: string,
    icon?: string | null,
    color?: string | null,
  ) => void;
  setSelectedAccountIds: (ids: string[]) => void;
  setSelectedTags: (tags: PickedTag[]) => void;
  clearAll: () => void;
};

export const usePickerStore = create<PickerStore>((set) => ({
  accountType: null,
  currency: null,
  icon: null,
  iconColor: null,
  categoryId: null,
  categoryName: null,
  categoryIcon: null,
  categoryColor: null,
  selectedAccountIds: null,
  selectedTags: null,
  setAccountType: (v) => set({ accountType: v }),
  setCurrency: (v) => set({ currency: v }),
  setIcon: (icon, color) => set({ icon, iconColor: color }),
  setCategory: (id, name, icon = null, color = null) =>
    set({
      categoryId: id,
      categoryName: name,
      categoryIcon: icon,
      categoryColor: color,
    }),
  setSelectedAccountIds: (ids) => set({ selectedAccountIds: ids }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  clearAll: () =>
    set({
      accountType: null,
      currency: null,
      icon: null,
      iconColor: null,
      categoryId: null,
      categoryName: null,
      categoryIcon: null,
      categoryColor: null,
      selectedAccountIds: null,
      selectedTags: null,
    }),
}));
