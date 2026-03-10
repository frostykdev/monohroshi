import { useEffect, useState } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Redirect } from "expo-router";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import { colors } from "@constants/colors";

const Index = () => {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Fires immediately with cached auth state — no async delay perceived
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

  return (
    <Redirect href={authenticated ? "/(home)" : "/(onboarding)/welcome"} />
  );
};

const s = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
});

export default Index;
