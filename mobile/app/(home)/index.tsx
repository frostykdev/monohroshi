import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";

const HomeScreen = () => {
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await signOut(getAuth());
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Typography variant="h1" align="center">
        Home
      </Typography>
      <Button variant="ghost" size="sm" onPress={handleLogout}>
        Log out
      </Button>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
});

export default HomeScreen;
