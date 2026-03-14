import { Stack } from "expo-router";
import { colors } from "@constants/colors";

const SettingsLayout = () => (
  <Stack
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
    }}
  />
);

export default SettingsLayout;
