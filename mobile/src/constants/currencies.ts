import rawCurrencies from "./currencies.json";

export type Currency = {
  code: string;
  name: string;
};

const currencyMap = new Map<string, Currency>(
  rawCurrencies.map((c) => [c.code, c]),
);

export const ALL_CURRENCIES: Currency[] = rawCurrencies;

export const SUGGESTED_CURRENCIES: Currency[] = ["EUR", "USD", "UAH"]
  .map((code) => currencyMap.get(code))
  .filter((c): c is Currency => !!c);

export const getCurrencyByCode = (code: string): Currency | undefined =>
  currencyMap.get(code);

const FLAG_OVERRIDES: Record<string, string> = {
  EUR: "🇪🇺",
};

export const currencyFlag = (code: string): string => {
  if (FLAG_OVERRIDES[code]) return FLAG_OVERRIDES[code];
  const countryCode = code.slice(0, 2).toUpperCase();
  return countryCode
    .split("")
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
    .join("");
};
