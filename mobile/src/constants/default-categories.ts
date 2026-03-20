import { Ionicons } from "@expo/vector-icons";
import type { TFunction } from "i18next";

type TranslateFn = (key: string) => string;

export type CategoryItem = {
  id: string;
  name: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  type: "expense" | "income";
  isSystem?: boolean;
  systemCode?: string;
  translationKey?: string;
};

let nextId = 1;
const makeId = () => `cat_${nextId++}`;

export const DEFAULT_EXPENSE_CATEGORIES: CategoryItem[] = [
  {
    id: makeId(),
    name: "Education",
    icon: "school-outline",
    type: "expense",
    translationKey: "defaultCategories.education",
  },
  {
    id: makeId(),
    name: "Travel",
    icon: "airplane-outline",
    type: "expense",
    translationKey: "defaultCategories.travel",
  },
  {
    id: makeId(),
    name: "Transport",
    icon: "car-outline",
    type: "expense",
    translationKey: "defaultCategories.transport",
  },
  {
    id: makeId(),
    name: "Health",
    icon: "medkit-outline",
    type: "expense",
    translationKey: "defaultCategories.health",
  },
  {
    id: makeId(),
    name: "Bills",
    icon: "document-text-outline",
    type: "expense",
    translationKey: "defaultCategories.bills",
  },
  {
    id: makeId(),
    name: "Home",
    icon: "home-outline",
    type: "expense",
    translationKey: "defaultCategories.home",
  },
  {
    id: makeId(),
    name: "Clothing",
    icon: "shirt-outline",
    type: "expense",
    translationKey: "defaultCategories.clothing",
  },
  {
    id: makeId(),
    name: "Groceries",
    icon: "cart-outline",
    type: "expense",
    translationKey: "defaultCategories.groceries",
  },
  {
    id: makeId(),
    name: "Eating out",
    icon: "restaurant-outline",
    type: "expense",
    translationKey: "defaultCategories.eatingOut",
  },
  {
    id: makeId(),
    name: "Digital",
    icon: "globe-outline",
    type: "expense",
    translationKey: "defaultCategories.digital",
  },
  {
    id: makeId(),
    name: "Entertainment",
    icon: "game-controller-outline",
    type: "expense",
    translationKey: "defaultCategories.entertainment",
  },
  {
    id: makeId(),
    name: "Gifts",
    icon: "gift-outline",
    type: "expense",
    translationKey: "defaultCategories.gifts",
  },
];

export const DEFAULT_INCOME_CATEGORIES: CategoryItem[] = [
  {
    id: makeId(),
    name: "Salary",
    icon: "briefcase-outline",
    type: "income",
    translationKey: "defaultCategories.salary",
  },
  {
    id: makeId(),
    name: "Freelance",
    icon: "globe-outline",
    type: "income",
    translationKey: "defaultCategories.freelance",
  },
  {
    id: makeId(),
    name: "Sale",
    icon: "storefront-outline",
    type: "income",
    translationKey: "defaultCategories.sale",
  },
  {
    id: makeId(),
    name: "Gifts",
    icon: "gift-outline",
    type: "income",
    translationKey: "defaultCategories.gifts",
  },
  {
    id: makeId(),
    name: "Other income",
    icon: "wallet-outline",
    type: "income",
    translationKey: "defaultCategories.otherIncome",
  },
  {
    id: makeId(),
    name: "Refund",
    icon: "refresh-outline",
    type: "income",
    isSystem: true,
    systemCode: "refund",
    translationKey: "defaultCategories.refund",
  },
];

export const createCategoryId = () => `cat_${nextId++}`;

export const getCategoryDisplayName = (
  category: { name: string; translationKey?: string | null },
  t: TranslateFn | TFunction,
): string => {
  if (category.translationKey) {
    return (t as TranslateFn)(category.translationKey);
  }
  return category.name;
};
