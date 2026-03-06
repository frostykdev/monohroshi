import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import uk from "./locales/uk.json";

export const SUPPORTED_LANGUAGES = ["uk", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const deviceLanguage = getLocales()[0]?.languageCode ?? "uk";
const lng = SUPPORTED_LANGUAGES.includes(deviceLanguage as SupportedLanguage)
  ? (deviceLanguage as SupportedLanguage)
  : "uk";

i18n.use(initReactI18next).init({
  lng,
  fallbackLng: "uk",
  resources: {
    en: { translation: en },
    uk: { translation: uk },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
