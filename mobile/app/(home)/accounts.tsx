import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

const AccountsScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top + 16 }]}>
      <View style={s.header}>
        <Typography variant="h2" i18nKey="home.tabs.accounts" />
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
    paddingHorizontal: 24,
  } as ViewStyle,
});

export default AccountsScreen;
