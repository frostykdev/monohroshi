import { useMemo, useState } from "react";
import {
  Pressable,
  SectionList,
  SectionListData,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { colors } from "@constants/colors";
import {
  ALL_CURRENCIES,
  Currency,
  SUGGESTED_CURRENCIES,
  currencyFlag,
} from "@constants/currencies";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { SearchBar } from "@components/ui/SearchBar";
import { usePickerStore } from "@stores/usePickerStore";

type Section = SectionListData<Currency, { title: string }>;

const CurrencyPickerScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const [search, setSearch] = useState("");
  const setCurrency = usePickerStore((s) => s.setCurrency);

  const sections = useMemo<Section[]>(() => {
    const q = search.trim().toLowerCase();
    const matches = (c: Currency) =>
      !q ||
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q);

    const suggested = SUGGESTED_CURRENCIES.filter(matches);
    const all = [...ALL_CURRENCIES]
      .filter(matches)
      .sort((a, b) => a.name.localeCompare(b.name));

    const result: Section[] = [];
    if (suggested.length > 0) {
      result.push({
        title: t("onboarding.currencySelect.suggested"),
        data: suggested,
      });
    }
    if (all.length > 0) {
      result.push({
        title: t("onboarding.currencySelect.allCurrencies"),
        data: all,
      });
    }
    return result;
  }, [search, t]);

  const handleSelect = (code: string) => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
    setCurrency(code);
    router.back();
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScreenHeader
        title={t("onboarding.currencySelect.modalTitle")}
        left={<Ionicons name="close" size={24} color={colors.textPrimary} />}
        onLeftPress={() => router.back()}
      />

      <View style={s.searchRow}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t("onboarding.currencySelect.search")}
          onCancel={() => setSearch("")}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.code}
        contentContainerStyle={s.listContent}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <Typography variant="caption" color="textSecondary">
              {section.title}
            </Typography>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              s.currencyItem,
              pressed && s.itemPressed,
              item.code === selected && s.itemSelected,
            ]}
            onPress={() => handleSelect(item.code)}
          >
            <View style={s.flagCircle}>
              <Typography variant="h3">{currencyFlag(item.code)}</Typography>
            </View>
            <View style={s.currencyInfo}>
              <Typography variant="label" color="textPrimary">
                {item.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {item.code}
              </Typography>
            </View>
            {item.code === selected && (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={colors.accent}
              />
            )}
          </Pressable>
        )}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  } as ViewStyle,
  listContent: {
    paddingBottom: 24,
  } as ViewStyle,
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
  } as ViewStyle,
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  } as ViewStyle,
  itemPressed: {
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
  itemSelected: {
    backgroundColor: `${colors.accent}18`,
  } as ViewStyle,
  flagCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  currencyInfo: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
});

export default CurrencyPickerScreen;
