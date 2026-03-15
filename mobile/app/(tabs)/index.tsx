import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

const HomeScreen = () => {
  const insets = useSafeAreaInsets();

  const openAddTransaction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push("/(modals)/add-transaction" as never);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + 16 }]}>
      <View style={s.header}>
        <Typography variant="h2" i18nKey="home.tabs.home" />
      </View>

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          s.fab,
          { bottom: insets.bottom + 90 },
          pressed && s.fabPressed,
        ]}
        onPress={openAddTransaction}
      >
        <Ionicons name="add" size={28} color={colors.textOnAccent} />
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  header: {
    paddingHorizontal: 24,
  } as ViewStyle,
  fab: {
    position: "absolute",
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  } as ViewStyle,
  fabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  } as ViewStyle,
});

export default HomeScreen;
