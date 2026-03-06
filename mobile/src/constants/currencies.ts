export type Currency = {
  code: string;
};

export const SUGGESTED_CURRENCIES: Currency[] = [
  { code: "EUR" },
  { code: "USD" },
  { code: "UAH" },
];

export const ALL_CURRENCIES: Currency[] = [
  { code: "AFN" },
  { code: "ALL" },
  { code: "AMD" },
  { code: "ARS" },
  { code: "AUD" },
  { code: "AZN" },
  { code: "BAM" },
  { code: "BDT" },
  { code: "BGN" },
  { code: "BHD" },
  { code: "BND" },
  { code: "BOB" },
  { code: "BRL" },
  { code: "BWP" },
  { code: "BYN" },
  { code: "CAD" },
  { code: "CHF" },
  { code: "CLP" },
  { code: "CNY" },
  { code: "COP" },
  { code: "CZK" },
  { code: "DKK" },
  { code: "DZD" },
  { code: "EGP" },
  { code: "EUR" },
  { code: "GBP" },
  { code: "GEL" },
  { code: "GHS" },
  { code: "GTQ" },
  { code: "HKD" },
  { code: "HNL" },
  { code: "HUF" },
  { code: "IDR" },
  { code: "ILS" },
  { code: "INR" },
  { code: "IQD" },
  { code: "IRR" },
  { code: "ISK" },
  { code: "JOD" },
  { code: "JPY" },
  { code: "KES" },
  { code: "KRW" },
  { code: "KWD" },
  { code: "KZT" },
  { code: "LBP" },
  { code: "LKR" },
  { code: "MAD" },
  { code: "MDL" },
  { code: "MXN" },
  { code: "MYR" },
  { code: "NGN" },
  { code: "NOK" },
  { code: "NPR" },
  { code: "NZD" },
  { code: "OMR" },
  { code: "PEN" },
  { code: "PHP" },
  { code: "PKR" },
  { code: "PLN" },
  { code: "QAR" },
  { code: "RON" },
  { code: "RSD" },
  { code: "SAR" },
  { code: "SEK" },
  { code: "SGD" },
  { code: "THB" },
  { code: "TRY" },
  { code: "TWD" },
  { code: "TZS" },
  { code: "UAH" },
  { code: "UGX" },
  { code: "USD" },
  { code: "UYU" },
  { code: "UZS" },
  { code: "VND" },
  { code: "YER" },
  { code: "ZAR" },
  { code: "ZMW" },
];

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

export const getCurrencyDisplayName = (
  code: string,
  language: string,
): string => {
  try {
    const dn = new Intl.DisplayNames(language, { type: "currency" });
    return dn.of(code) ?? code;
  } catch {
    try {
      const dn = new Intl.DisplayNames("en", { type: "currency" });
      return dn.of(code) ?? code;
    } catch {
      return code;
    }
  }
};
