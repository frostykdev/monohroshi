import "../src/i18n";

import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { env } from "@constants/env";
import { useRevenueCat } from "@hooks/useRevenueCat";
import { useAuthListener } from "@hooks/useAuthListener";
import { useAppsFlyer } from "@hooks/useAppsFlyer";

GoogleSignin.configure({
  webClientId: env.googleWebClientId,
  offlineAccess: true,
});

const RootLayout = () => {
  useRevenueCat();
  useAuthListener();
  useAppsFlyer();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
