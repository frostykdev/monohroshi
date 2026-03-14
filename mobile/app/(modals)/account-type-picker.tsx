import {
  FlatList,
  Pressable,
  StyleSheet,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { colors } from "@constants/colors";
import { ACCOUNT_TYPES, AccountTypeConfig } from "@constants/account-types";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { usePickerStore } from "@stores/usePickerStore";

const COLS = 2;
const GAP = 10;

const AccountTypePickerScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const setAccountType = usePickerStore((s) => s.setAccountType);

  const cardSize = (width - GAP * (COLS + 1)) / COLS;

  const handleSelect = (type: string) => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
    setAccountType(type);
    router.back();
  };

  const renderItem = ({ item }: { item: AccountTypeConfig }) => {
    const isSelected = item.type === selected;
    return (
      <Pressable
        style={({ pressed }) => [
          s.card,
          { width: cardSize, height: cardSize * 0.8 },
          isSelected && s.cardSelected,
          pressed && s.cardPressed,
        ]}
        onPress={() => handleSelect(item.type)}
      >
        {isSelected && (
          <View style={s.checkBadge}>
            <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
          </View>
        )}
        <Ionicons name={item.icon} size={40} color={colors.textPrimary} />
        <Typography variant="bodySmall" align="center" style={s.cardLabel}>
          {t(`onboarding.accountSetup.types.${item.type}` as never)}
        </Typography>
      </Pressable>
    );
  };

  return (
    <View
      style={[s.container, { paddingBottom: insets.bottom, paddingTop: 10 }]}
    >
      <ScreenHeader
        title={t("onboarding.accountSetup.selectType")}
        left={<Ionicons name="close" size={24} color={colors.textPrimary} />}
        onLeftPress={() => router.back()}
      />
      <FlatList
        data={ACCOUNT_TYPES}
        keyExtractor={(item) => item.type}
        renderItem={renderItem}
        numColumns={COLS}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  listContent: {
    padding: GAP,
    gap: GAP,
  } as ViewStyle,
  row: {
    gap: GAP,
  } as ViewStyle,
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  } as ViewStyle,
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}14`,
  } as ViewStyle,
  cardPressed: {
    opacity: 0.65,
  } as ViewStyle,
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  } as ViewStyle,
  cardLabel: {
    fontWeight: "500",
  } as TextStyle,
});

export default AccountTypePickerScreen;
