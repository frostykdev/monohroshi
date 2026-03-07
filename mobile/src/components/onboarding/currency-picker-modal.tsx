import { forwardRef, useCallback, useMemo, useState } from "react";
import {
  Pressable,
  SectionListData,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetSectionList,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import {
  ALL_CURRENCIES,
  Currency,
  SUGGESTED_CURRENCIES,
  currencyFlag,
  getCurrencyDisplayName,
} from "@constants/currencies";
import { Typography } from "@components/ui/Typography";
import { SearchBar } from "@components/ui/SearchBar";

type Section = SectionListData<Currency, { title: string }>;

type Props = {
  selectedCode: string;
  onSelect: (code: string) => void;
};

export const CurrencyPickerModal = forwardRef<BottomSheetModal, Props>(
  ({ selectedCode, onSelect }, ref) => {
    const { t, i18n } = useTranslation();
    const { top } = useSafeAreaInsets();
    const [search, setSearch] = useState("");

    const getDisplayName = useMemo(
      () => (code: string) => getCurrencyDisplayName(code, i18n.language),
      [i18n.language],
    );

    const sections = useMemo<Section[]>(() => {
      const q = search.trim().toLowerCase();

      const matches = (c: Currency) =>
        !q ||
        c.code.toLowerCase().includes(q) ||
        getDisplayName(c.code).toLowerCase().includes(q);

      const suggested = SUGGESTED_CURRENCIES.filter(matches);
      const all = [...ALL_CURRENCIES]
        .filter(matches)
        .sort((a, b) =>
          getDisplayName(a.code).localeCompare(getDisplayName(b.code)),
        );

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
    }, [search, getDisplayName, t]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.7}
        />
      ),
      [],
    );

    const handleSelect = useCallback(
      (code: string) => {
        onSelect(code);
        setSearch("");
      },
      [onSelect],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={["92%"]}
        topInset={top}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={s.sheetBackground}
        handleIndicatorStyle={s.handle}
      >
        {/* Search */}
        <View style={s.searchRow}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t("onboarding.currencySelect.search")}
            InputComponent={BottomSheetTextInput}
            onCancel={() => setSearch("")}
          />
        </View>

        {/* List */}
        <BottomSheetSectionList
          sections={sections}
          keyExtractor={(item: Currency) => item.code}
          contentContainerStyle={s.listContent}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          renderSectionHeader={({ section }: { section: Section }) => (
            <View style={s.sectionHeader}>
              <Typography variant="caption" color="textSecondary">
                {section.title}
              </Typography>
            </View>
          )}
          renderItem={({ item }: { item: Currency }) => (
            <Pressable
              style={({ pressed }) => [
                s.currencyItem,
                pressed && s.itemPressed,
                item.code === selectedCode && s.itemSelected,
              ]}
              onPress={() => handleSelect(item.code)}
            >
              <View style={s.flagCircle}>
                <Typography variant="h3">{currencyFlag(item.code)}</Typography>
              </View>
              <View style={s.currencyInfo}>
                <Typography variant="label" color="textPrimary">
                  {getDisplayName(item.code)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {item.code}
                </Typography>
              </View>
              {item.code === selectedCode && (
                <Typography variant="body" color="accent">
                  ✓
                </Typography>
              )}
            </Pressable>
          )}
        />
      </BottomSheetModal>
    );
  },
);

CurrencyPickerModal.displayName = "CurrencyPickerModal";

const s = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  handle: {
    backgroundColor: colors.border,
    width: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  } as ViewStyle,
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  } as ViewStyle,
  listContent: {
    paddingBottom: 40,
  } as ViewStyle,
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  currencyInfo: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
});
