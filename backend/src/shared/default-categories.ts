import { CATEGORY_TYPES, SYSTEM_CATEGORIES } from "./constants";

type DefaultCategory = {
  name: string;
  type: string;
  icon: string;
  isSystem?: boolean;
  systemCode?: string;
};

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { name: "Education", type: CATEGORY_TYPES.EXPENSE, icon: "school" },
  { name: "Travel", type: CATEGORY_TYPES.EXPENSE, icon: "flight" },
  { name: "Transport", type: CATEGORY_TYPES.EXPENSE, icon: "directions-car" },
  { name: "Health", type: CATEGORY_TYPES.EXPENSE, icon: "local-hospital" },
  { name: "Bills", type: CATEGORY_TYPES.EXPENSE, icon: "description" },
  { name: "Home", type: CATEGORY_TYPES.EXPENSE, icon: "home" },
  { name: "Clothing", type: CATEGORY_TYPES.EXPENSE, icon: "checkroom" },
  { name: "Groceries", type: CATEGORY_TYPES.EXPENSE, icon: "shopping-cart" },
  { name: "Eating out", type: CATEGORY_TYPES.EXPENSE, icon: "restaurant" },
  { name: "Digital", type: CATEGORY_TYPES.EXPENSE, icon: "language" },
  { name: "Entertainment", type: CATEGORY_TYPES.EXPENSE, icon: "sports-esports" },
  { name: "Gifts", type: CATEGORY_TYPES.EXPENSE, icon: "card-giftcard" },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { name: "Salary", type: CATEGORY_TYPES.INCOME, icon: "work" },
  { name: "Freelance", type: CATEGORY_TYPES.INCOME, icon: "public" },
  { name: "Sale", type: CATEGORY_TYPES.INCOME, icon: "storefront" },
  { name: "Gifts", type: CATEGORY_TYPES.INCOME, icon: "card-giftcard" },
  { name: "Other income", type: CATEGORY_TYPES.INCOME, icon: "account-balance-wallet" },
];

export const SYSTEM_DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: "Refund",
    type: CATEGORY_TYPES.INCOME,
    icon: "replay",
    isSystem: true,
    systemCode: SYSTEM_CATEGORIES.REFUND,
  },
];

export const ALL_DEFAULT_CATEGORIES: DefaultCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
  ...SYSTEM_DEFAULT_CATEGORIES,
];
