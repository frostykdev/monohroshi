import { useState, useCallback } from "react";
import { FlatList, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { colors } from "@constants/colors";
import { getIconColor } from "@constants/icon-list";
import {
  getCurrencySymbol,
  getAccountTypeConfig,
} from "@constants/account-types";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { useAccounts } from "@services/accounts/accounts.queries";
import { usePickerStore } from "@stores/usePickerStore";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import type { Account } from "@services/accounts/accounts.api";

const AccountPickerScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const workspaceId = useWorkspaceStore((s) => s.id);
  const { selected } = useLocalSearchParams<{ selected?: string }>();

  const { data: accounts = [] } = useAccounts(workspaceId);

  const initialIds = selected
    ? selected.split(",").filter(Boolean)
    : accounts.map((a) => a.id);

  const [localIds, setLocalIds] = useState<string[]>(initialIds);

  const allSelected = localIds.length === accounts.length;

  const toggle = useCallback((id: string) => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
    setLocalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
    setLocalIds(allSelected ? [] : accounts.map((a) => a.id));
  }, [allSelected, accounts]);

  const handleApply = () => {
    const result = localIds.length === accounts.length ? [] : localIds;
    usePickerStore.setState({ selectedAccountIds: result });
    router.back();
  };

  const renderItem = ({ item, index }: { item: Account; index: number }) => {
    const cfg = getAccountTypeConfig(item.type);
    const checked = localIds.includes(item.id);
    const bg = item.color ?? cfg.color;
    const isFirst = index === 0;
    const isLast = index === accounts.length - 1;

    return (
      <Pressable
        style={({ pressed }) => [
          ps.row,
          isFirst && ps.firstRow,
          isLast && ps.lastRow,
          !isLast && ps.divider,
          pressed && ps.pressed,
        ]}
        onPress={() => toggle(item.id)}
      >
        <View style={[ps.icon, { backgroundColor: bg }]}>
          <Ionicons
            name={
              (item.icon as React.ComponentProps<typeof Ionicons>["name"]) ??
              cfg.icon
            }
            size={18}
            color={getIconColor(bg)}
          />
        </View>
        <View style={ps.info}>
          <Typography variant="label">{item.name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {parseFloat(item.balance).toFixed(2)}{" "}
            {getCurrencySymbol(item.currency)}
          </Typography>
        </View>
        <View style={checked ? ps.checkOn : ps.checkOff}>
          {checked && (
            <Ionicons name="checkmark" size={14} color={colors.textOnAccent} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        ps.screen,
        { paddingBottom: insets.bottom, paddingTop: insets.top },
      ]}
    >
      <ScreenHeader
        title={t("analytics.source")}
        left={<Ionicons name="close" size={24} color={colors.textPrimary} />}
        onLeftPress={() => router.back()}
        right={
          <Typography variant="label" color="textPrimary">
            {t("analytics.show")}
          </Typography>
        }
        onRightPress={handleApply}
        rightVariant="pill"
      />

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <Pressable
            style={({ pressed }) => [
              ps.row,
              ps.selectAllRow,
              pressed && ps.pressed,
            ]}
            onPress={toggleAll}
          >
            <View style={ps.allIcon}>
              <Ionicons
                name="layers-outline"
                size={18}
                color={colors.textPrimary}
              />
            </View>
            <View style={ps.info}>
              <Typography variant="label">
                {t("analytics.allAccounts")}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {accounts.length}{" "}
                {accounts.length === 1 ? "account" : "accounts"}
              </Typography>
            </View>
            <View style={allSelected ? ps.checkOn : ps.checkOff}>
              {allSelected && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={colors.textOnAccent}
                />
              )}
            </View>
          </Pressable>
        }
        contentContainerStyle={ps.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const ps = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  } as ViewStyle,
  selectAllRow: {
    borderRadius: 14,
    marginBottom: 0,
  } as ViewStyle,
  allIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  firstRow: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  } as ViewStyle,
  lastRow: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  } as ViewStyle,
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  } as ViewStyle,
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  info: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  checkOn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  checkOff: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
  } as ViewStyle,
  pressed: { opacity: 0.65 } as ViewStyle,
});

export default AccountPickerScreen;
