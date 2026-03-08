export const env = {
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? "",
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? "",
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? "",
} as const;
