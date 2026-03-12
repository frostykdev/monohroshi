import { StyleSheet, View, Pressable, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

const HomeScreen = () => {
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await signOut(getAuth());
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={s.header}>
        <Typography variant="h2">Home</Typography>
        <Pressable
          style={({ pressed }) => [s.logoutButton, pressed && s.pressed]}
          onPress={handleLogout}
          hitSlop={8}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  } as ViewStyle,
  logoutButton: {
    padding: 4,
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
});

export default HomeScreen;
