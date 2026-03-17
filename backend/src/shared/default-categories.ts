import { CATEGORY_TYPES, SYSTEM_CATEGORIES } from "./constants";

type DefaultCategory = {
  name: string;
  type: string;
  icon: string;
  isSystem?: boolean;
  systemCode?: string;
  translationKey?: string;
};

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { name: "Education", type: CATEGORY_TYPES.EXPENSE, icon: "school-outline", translationKey: "defaultCategories.education" },
  { name: "Travel", type: CATEGORY_TYPES.EXPENSE, icon: "airplane-outline", translationKey: "defaultCategories.travel" },
  { name: "Transport", type: CATEGORY_TYPES.EXPENSE, icon: "car-outline", translationKey: "defaultCategories.transport" },
  { name: "Health", type: CATEGORY_TYPES.EXPENSE, icon: "medkit-outline", translationKey: "defaultCategories.health" },
  { name: "Bills", type: CATEGORY_TYPES.EXPENSE, icon: "document-text-outline", translationKey: "defaultCategories.bills" },
  { name: "Home", type: CATEGORY_TYPES.EXPENSE, icon: "home-outline", translationKey: "defaultCategories.home" },
  { name: "Clothing", type: CATEGORY_TYPES.EXPENSE, icon: "shirt-outline", translationKey: "defaultCategories.clothing" },
  { name: "Groceries", type: CATEGORY_TYPES.EXPENSE, icon: "cart-outline", translationKey: "defaultCategories.groceries" },
  { name: "Eating out", type: CATEGORY_TYPES.EXPENSE, icon: "restaurant-outline", translationKey: "defaultCategories.eatingOut" },
  { name: "Digital", type: CATEGORY_TYPES.EXPENSE, icon: "globe-outline", translationKey: "defaultCategories.digital" },
  { name: "Entertainment", type: CATEGORY_TYPES.EXPENSE, icon: "game-controller-outline", translationKey: "defaultCategories.entertainment" },
  { name: "Gifts", type: CATEGORY_TYPES.EXPENSE, icon: "gift-outline", translationKey: "defaultCategories.gifts" },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { name: "Salary", type: CATEGORY_TYPES.INCOME, icon: "briefcase-outline", translationKey: "defaultCategories.salary" },
  { name: "Freelance", type: CATEGORY_TYPES.INCOME, icon: "globe-outline", translationKey: "defaultCategories.freelance" },
  { name: "Sale", type: CATEGORY_TYPES.INCOME, icon: "storefront-outline", translationKey: "defaultCategories.sale" },
  { name: "Gifts", type: CATEGORY_TYPES.INCOME, icon: "gift-outline", translationKey: "defaultCategories.gifts" },
  { name: "Other income", type: CATEGORY_TYPES.INCOME, icon: "wallet-outline", translationKey: "defaultCategories.otherIncome" },
];

export const SYSTEM_DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: "Refund",
    type: CATEGORY_TYPES.INCOME,
    icon: "refresh-outline",
    isSystem: true,
    systemCode: SYSTEM_CATEGORIES.REFUND,
    translationKey: "defaultCategories.refund",
  },
];

export const ALL_DEFAULT_CATEGORIES: DefaultCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
  ...SYSTEM_DEFAULT_CATEGORIES,
];
