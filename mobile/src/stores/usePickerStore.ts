import { create } from "zustand";

type PickerStore = {
  accountType: string | null;
  currency: string | null;
  icon: string | null;
  iconColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  setAccountType: (v: string) => void;
  setCurrency: (v: string) => void;
  setIcon: (icon: string, color: string) => void;
  setCategory: (id: string, name: string) => void;
  clearAll: () => void;
};

export const usePickerStore = create<PickerStore>((set) => ({
  accountType: null,
  currency: null,
  icon: null,
  iconColor: null,
  categoryId: null,
  categoryName: null,
  setAccountType: (v) => set({ accountType: v }),
  setCurrency: (v) => set({ currency: v }),
  setIcon: (icon, color) => set({ icon, iconColor: color }),
  setCategory: (id, name) => set({ categoryId: id, categoryName: name }),
  clearAll: () =>
    set({
      accountType: null,
      currency: null,
      icon: null,
      iconColor: null,
      categoryId: null,
      categoryName: null,
    }),
}));
