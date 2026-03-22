export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? "",
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? "",
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? "",
  revenueCatiOSApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "",
  revenueCatAndroidApiKey:
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "",
  appsFlyerDevKey: process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY ?? "",
  oneSignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? "",
} as const;
