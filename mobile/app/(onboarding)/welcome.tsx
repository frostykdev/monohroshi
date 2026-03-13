import { useCallback, useRef } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { CardIllustration } from "@components/onboarding/CardIllustration";
import { AuthBottomSheet } from "@components/onboarding/AuthBottomSheet";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";
import { colors } from "@constants/colors";
import { useAppleSignIn } from "@hooks/useAppleSignIn";
import { useGoogleSignIn } from "@hooks/useGoogleSignIn";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import { useSetupStore } from "@stores/useSetupStore";

const WelcomeScreen = () => {
  const insets = useSafeAreaInsets();
  const authSheetRef = useRef<BottomSheetModal>(null);
  const setOnboardingComplete = useOnboardingStore(
    (s) => s.setOnboardingComplete,
  );
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const resetSetup = useSetupStore((s) => s.reset);

  const onSignInSuccess = useCallback(() => {
    setOnboardingComplete(true);
    router.replace("/(home)");
  }, [setOnboardingComplete]);

  const { handleSignIn: handleApplePress, loading: appleLoading } =
    useAppleSignIn("signin", onSignInSuccess);

  const { handleSignIn: handleGooglePress, loading: googleLoading } =
    useGoogleSignIn("signin", onSignInSuccess);

  const handleGetStarted = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    resetOnboarding();
    resetSetup();
    router.push("/(onboarding)/quiz");
  };

  const handleLogin = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
    authSheetRef.current?.present();
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <Animated.View
        entering={FadeInDown.delay(100).duration(600).springify()}
        style={s.illustration}
      >
        <CardIllustration />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(300).duration(500)}
        style={s.textContent}
      >
        <Typography variant="h1" i18nKey="onboarding.welcome.title" />
        <Typography
          variant="body"
          color="textSecondary"
          i18nKey="onboarding.welcome.subtitle"
        />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(450).duration(500)}
        style={s.actions}
      >
        <Button
          variant="primary"
          i18nKey="onboarding.welcome.getStarted"
          onPress={handleGetStarted}
        />
        <Button
          variant="ghost"
          size="sm"
          i18nKey="onboarding.welcome.login"
          onPress={handleLogin}
        />
      </Animated.View>

      <AuthBottomSheet
        ref={authSheetRef}
        mode="signin"
        appleLoading={appleLoading}
        googleLoading={googleLoading}
        onApplePress={handleApplePress}
        onGooglePress={handleGooglePress}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  } as ViewStyle,
  illustration: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  textContent: {
    gap: 12,
    marginBottom: 40,
  } as ViewStyle,
  actions: {
    gap: 12,
  } as ViewStyle,
});

export default WelcomeScreen;
