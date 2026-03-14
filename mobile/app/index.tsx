import { useEffect, useState } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Redirect } from "expo-router";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import { colors } from "@constants/colors";
import { useOnboardingStore } from "@stores/useOnboardingStore";

const Index = () => {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const isOnboardingComplete = useOnboardingStore(
    (s) => s.isOnboardingComplete,
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      setAuthenticated(!!user);
      setReady(true);
      unsubscribe();
    });

    return unsubscribe;
  }, []);

  if (!ready) {
    return <View style={s.splash} />;
  }

  if (authenticated && isOnboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  if (authenticated && !isOnboardingComplete) {
    return <Redirect href="/(onboarding)/creating-plan" />;
  }

  return <Redirect href="/(onboarding)/welcome" />;
};

const s = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
});

export default Index;
