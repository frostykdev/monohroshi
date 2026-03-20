import { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { router } from "expo-router";
import { colors } from "@constants/colors";

const AnalyticsRedirect = () => {
  useEffect(() => {
    router.replace("/insights" as never);
  }, []);

  return <View style={s.container} />;
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
});

export default AnalyticsRedirect;
