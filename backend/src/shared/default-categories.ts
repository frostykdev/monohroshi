import { CATEGORY_TYPES, SYSTEM_CATEGORIES } from "./constants";

type DefaultCategory = {
  name: string;
  type: string;
  icon: string;
  isSystem?: boolean;
  systemCode?: string;
};

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { name: "Education", type: CATEGORY_TYPES.EXPENSE, icon: "school-outline" },
  { name: "Travel", type: CATEGORY_TYPES.EXPENSE, icon: "airplane-outline" },
  { name: "Transport", type: CATEGORY_TYPES.EXPENSE, icon: "car-outline" },
  { name: "Health", type: CATEGORY_TYPES.EXPENSE, icon: "medkit-outline" },
  { name: "Bills", type: CATEGORY_TYPES.EXPENSE, icon: "document-text-outline" },
  { name: "Home", type: CATEGORY_TYPES.EXPENSE, icon: "home-outline" },
  { name: "Clothing", type: CATEGORY_TYPES.EXPENSE, icon: "shirt-outline" },
  { name: "Groceries", type: CATEGORY_TYPES.EXPENSE, icon: "cart-outline" },
  { name: "Eating out", type: CATEGORY_TYPES.EXPENSE, icon: "restaurant-outline" },
  { name: "Digital", type: CATEGORY_TYPES.EXPENSE, icon: "globe-outline" },
  { name: "Entertainment", type: CATEGORY_TYPES.EXPENSE, icon: "game-controller-outline" },
  { name: "Gifts", type: CATEGORY_TYPES.EXPENSE, icon: "gift-outline" },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { name: "Salary", type: CATEGORY_TYPES.INCOME, icon: "briefcase-outline" },
  { name: "Freelance", type: CATEGORY_TYPES.INCOME, icon: "globe-outline" },
  { name: "Sale", type: CATEGORY_TYPES.INCOME, icon: "storefront-outline" },
  { name: "Gifts", type: CATEGORY_TYPES.INCOME, icon: "gift-outline" },
  { name: "Other income", type: CATEGORY_TYPES.INCOME, icon: "wallet-outline" },
];

export const SYSTEM_DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: "Refund",
    type: CATEGORY_TYPES.INCOME,
    icon: "refresh-outline",
    isSystem: true,
    systemCode: SYSTEM_CATEGORIES.REFUND,
  },
];

export const ALL_DEFAULT_CATEGORIES: DefaultCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
  ...SYSTEM_DEFAULT_CATEGORIES,
];
