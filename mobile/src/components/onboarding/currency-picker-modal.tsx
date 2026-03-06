import { forwardRef, useCallback, useMemo, useState } from "react";
import {
  Pressable,
  SectionListData,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
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

type Section = SectionListData<Currency, { title: string }>;

type Props = {
  selectedCode: string;
  onSelect: (code: string) => void;
};

export const CurrencyPickerModal = forwardRef<BottomSheetModal, Props>(
  ({ selectedCode, onSelect }, ref) => {
    const { t, i18n } = useTranslation();
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

    const handleDismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
      setSearch("");
    }, [ref]);

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
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={s.sheetBackground}
        handleIndicatorStyle={s.handle}
      >
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={handleDismiss} style={s.closeButton} hitSlop={8}>
            <Typography variant="label" color="textSecondary">
              ✕
            </Typography>
          </Pressable>
          <Typography variant="label" color="textPrimary">
            {t("onboarding.currencySelect.modalTitle")}
          </Typography>
          <View style={s.closeButton} />
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <View style={s.searchContainer}>
            <Typography variant="body" color="textTertiary">
              🔍
            </Typography>
            <BottomSheetTextInput
              style={s.searchInput}
              placeholder={t("onboarding.currencySelect.search")}
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Typography variant="label" color="accent">
                {t("common.cancel")}
              </Typography>
            </Pressable>
          )}
        </View>

        {/* List */}
        <BottomSheetSectionList
          sections={sections}
          keyExtractor={(item: Currency) => item.code}
          contentContainerStyle={s.listContent}
          stickySectionHeadersEnabled={false}
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  } as ViewStyle,
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    borderCurve: "continuous",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  } as TextStyle,
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
