import { Ionicons } from "@expo/vector-icons";

export type CategoryItem = {
  id: string;
  name: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  type: "expense" | "income";
  isSystem?: boolean;
  systemCode?: string;
};

let nextId = 1;
const makeId = () => `cat_${nextId++}`;

export const DEFAULT_EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: makeId(), name: "Education", icon: "school-outline", type: "expense" },
  { id: makeId(), name: "Travel", icon: "airplane-outline", type: "expense" },
  { id: makeId(), name: "Transport", icon: "car-outline", type: "expense" },
  { id: makeId(), name: "Health", icon: "medkit-outline", type: "expense" },
  {
    id: makeId(),
    name: "Bills",
    icon: "document-text-outline",
    type: "expense",
  },
  { id: makeId(), name: "Home", icon: "home-outline", type: "expense" },
  { id: makeId(), name: "Clothing", icon: "shirt-outline", type: "expense" },
  { id: makeId(), name: "Groceries", icon: "cart-outline", type: "expense" },
  {
    id: makeId(),
    name: "Eating out",
    icon: "restaurant-outline",
    type: "expense",
  },
  { id: makeId(), name: "Digital", icon: "globe-outline", type: "expense" },
  {
    id: makeId(),
    name: "Entertainment",
    icon: "game-controller-outline",
    type: "expense",
  },
  { id: makeId(), name: "Gifts", icon: "gift-outline", type: "expense" },
];

export const DEFAULT_INCOME_CATEGORIES: CategoryItem[] = [
  { id: makeId(), name: "Salary", icon: "briefcase-outline", type: "income" },
  { id: makeId(), name: "Freelance", icon: "globe-outline", type: "income" },
  { id: makeId(), name: "Sale", icon: "storefront-outline", type: "income" },
  { id: makeId(), name: "Gifts", icon: "gift-outline", type: "income" },
  {
    id: makeId(),
    name: "Other income",
    icon: "wallet-outline",
    type: "income",
  },
  {
    id: makeId(),
    name: "Refund",
    icon: "refresh-outline",
    type: "income",
    isSystem: true,
    systemCode: "refund",
  },
];

export const createCategoryId = () => `cat_${nextId++}`;
