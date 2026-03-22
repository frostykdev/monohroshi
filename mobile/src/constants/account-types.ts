import { Ionicons } from "@expo/vector-icons";

export type AccountTypeConfig = {
  type: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
};

export const ACCOUNT_TYPES: AccountTypeConfig[] = [
  { type: "bank_account", icon: "card", color: "#F5A623" },
  { type: "cash", icon: "cash", color: "#34C759" },
  { type: "savings", icon: "wallet", color: "#5AC8FA" },
  { type: "property", icon: "home", color: "#5E5CE6" },
  { type: "vehicles", icon: "car", color: "#30B0C7" },
  { type: "other_assets", icon: "layers", color: "#8E8E93" },
  { type: "credit_loan", icon: "pricetag", color: "#FF6B6B" },
  { type: "debt", icon: "alert-circle-outline", color: "#FF3B30" },
];

export const getAccountTypeConfig = (type: string): AccountTypeConfig =>
  ACCOUNT_TYPES.find((a) => a.type === type) ?? ACCOUNT_TYPES[0];

const SYMBOL_FALLBACKS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  KRW: "₩",
  INR: "₹",
  UAH: "₴",
  PLN: "zł",
  CZK: "Kč",
  TRY: "₺",
  THB: "฿",
  BRL: "R$",
  RUB: "₽",
  ILS: "₪",
  CHF: "CHF",
  CAD: "CA$",
  AUD: "A$",
  SGD: "S$",
  HKD: "HK$",
};

export const getCurrencySymbol = (code: string): string => {
  try {
    const symbol = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value;

    if (symbol && symbol !== code) return symbol;
  } catch {
    // Hermes may not support narrowSymbol
  }
  return SYMBOL_FALLBACKS[code] ?? code;
};
