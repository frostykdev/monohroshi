export const env = {
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? "",
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? "",
} as const;
