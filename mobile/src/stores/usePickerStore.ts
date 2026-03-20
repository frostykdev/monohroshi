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
  /** True when the category was picked via refund mode (expense category for an income refund transaction) */
  isRefundCategory: boolean;
  selectedAccountIds: string[] | null;
  selectedTags: PickedTag[] | null;
  /** ID of the most recently created transaction — used to animate it on the home screen */
  newTransactionId: string | null;
  setAccountType: (v: string) => void;
  setCurrency: (v: string) => void;
  setIcon: (icon: string, color: string) => void;
  setCategory: (
    id: string,
    name: string,
    icon?: string | null,
    color?: string | null,
    isRefund?: boolean,
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
  isRefundCategory: false,
  selectedAccountIds: null,
  selectedTags: null,
  newTransactionId: null,
  setAccountType: (v) => set({ accountType: v }),
  setCurrency: (v) => set({ currency: v }),
  setIcon: (icon, color) => set({ icon, iconColor: color }),
  setCategory: (id, name, icon = null, color = null, isRefund = false) =>
    set({
      categoryId: id,
      categoryName: name,
      categoryIcon: icon,
      categoryColor: color,
      isRefundCategory: isRefund,
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
      isRefundCategory: false,
      selectedAccountIds: null,
      selectedTags: null,
      newTransactionId: null,
    }),
}));
