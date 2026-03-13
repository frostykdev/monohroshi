import { FlatList, Pressable, StyleSheet, View, ViewStyle } from "react-native";
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

const AccountTypePickerScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const setAccountType = usePickerStore((s) => s.setAccountType);

  const handleSelect = (type: string) => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
    setAccountType(type);
    router.back();
  };

  const renderItem = ({ item }: { item: AccountTypeConfig }) => {
    const isSelected = item.type === selected;
    return (
      <Pressable
        style={({ pressed }) => [
          s.item,
          pressed && s.itemPressed,
          isSelected && s.itemSelected,
        ]}
        onPress={() => handleSelect(item.type)}
      >
        <View style={[s.iconCircle, { backgroundColor: `${item.color}20` }]}>
          <Ionicons name={item.icon} size={22} color={item.color} />
        </View>
        <Typography variant="label" color="textPrimary" style={s.itemLabel}>
          {t(`onboarding.accountSetup.types.${item.type}` as never)}
        </Typography>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
        )}
      </Pressable>
    );
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
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
    paddingBottom: 24,
  } as ViewStyle,
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  } as ViewStyle,
  itemPressed: {
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
  itemSelected: {
    backgroundColor: `${colors.accent}18`,
  } as ViewStyle,
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  itemLabel: {
    flex: 1,
  },
});

export default AccountTypePickerScreen;
