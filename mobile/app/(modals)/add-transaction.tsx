import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

const AddTransactionModal = () => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Typography variant="h2" i18nKey="addTransaction.title" />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: 24,
  } as ViewStyle,
});

export default AddTransactionModal;
