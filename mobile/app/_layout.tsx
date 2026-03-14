import "../src/i18n";

import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colors } from "@constants/colors";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { env } from "@constants/env";
import { useRevenueCat } from "@hooks/useRevenueCat";
import { useAuthListener } from "@hooks/useAuthListener";
import { useAppsFlyer } from "@hooks/useAppsFlyer";
import { queryClient } from "@services/query-client";

GoogleSignin.configure({
  webClientId: env.googleWebClientId,
  offlineAccess: true,
});

const RootLayout = () => {
  useRevenueCat();
  useAuthListener();
  useAppsFlyer();

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
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
    </GestureHandlerRootView>
  );
};

export default RootLayout;
