import { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { colors } from "@constants/colors";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { OneSignal } from "react-native-onesignal";
import { env } from "@constants/env";
import { useRevenueCat } from "@hooks/useRevenueCat";
import { useAuthListener } from "@hooks/useAuthListener";
import { useAppsFlyer } from "@hooks/useAppsFlyer";
import { queryClient } from "@services/query-client";
import { useLanguageStore } from "@stores/useLanguageStore";
import i18n from "@i18n";

OneSignal.initialize(env.oneSignalAppId);

GoogleSignin.configure({
  webClientId: env.googleWebClientId,
  offlineAccess: true,
});

const RootLayout = () => {
  useRevenueCat();
  useAuthListener();
  useAppsFlyer();

  // Apply the user's persisted language preference once the store hydrates.
  // If no preference is stored, i18n already initialised with the device locale
  // (see src/i18n/index.ts), so nothing extra is needed.
  const language = useLanguageStore((s) => s.language);
  const hasHydrated = useLanguageStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [hasHydrated, language]);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen
                name="(modals)"
                options={{ presentation: "fullScreenModal" }}
              />
            </Stack>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
