import { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import * as Haptics from "expo-haptics";
import { FlashList } from "@shopify/flash-list";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { colors } from "@constants/colors";
import { getCategoryDisplayName } from "@constants/default-categories";
import { getAccountTypeConfig } from "@constants/account-types";
import { getIconColor } from "@constants/icon-list";
import { Typography } from "@components/ui/Typography";
import { DatePickerSheet } from "@components/ui/DatePickerSheet";
import { TransactionItem } from "@components/transactions/TransactionItem";
import { CategoryRowsSkeleton } from "@components/ui/Skeleton";
import { FabAddButton } from "@components/ui/FabAddButton";
import {
  type DatePreset,
  DATE_PRESETS,
  getDateRange,
} from "@utils/date-presets";
import { useInfiniteTransactions } from "@services/transactions/transactions.queries";
import { useAccounts } from "@services/accounts/accounts.queries";
import { useCategories } from "@services/categories/categories.queries";
import { useTags } from "@services/tags/tags.queries";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { useSinglePressGuard } from "@hooks/useSinglePressGuard";
import type { Transaction } from "@services/transactions/transactions.api";
import type { Account } from "@services/accounts/accounts.api";

const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.65;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const haptic = () => {
  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync().catch(() => {});
};

// ─── List item types ──────────────────────────────────────────────────────────

type DateHeader = { _type: "header"; date: string; label: string };
type TxRow = { _type: "tx"; tx: Transaction; isLast: boolean };
type ListItem = DateHeader | TxRow;

const buildList = (txs: Transaction[], locale: string): ListItem[] => {
  const items: ListItem[] = [];
  let lastDate = "";
  txs.forEach((tx, i) => {
    const dateKey = tx.date.slice(0, 10);
    if (dateKey !== lastDate) {
      lastDate = dateKey;
      const dt = DateTime.fromISO(dateKey).setLocale(locale);
      const today = DateTime.now().toISODate();
      const yesterday = DateTime.now().minus({ days: 1 }).toISODate();
      const label =
        dateKey === today
          ? "Today"
          : dateKey === yesterday
            ? "Yesterday"
            : dt.toLocaleString({
                day: "numeric",
                month: "long",
                year: "numeric",
              });
      items.push({ _type: "header", date: dateKey, label });
    }
    const nextTx = txs[i + 1];
    const nextDate = nextTx?.date.slice(0, 10);
    items.push({ _type: "tx", tx, isLast: nextDate !== dateKey });
  });
  return items;
};

// ─── Date sheet ───────────────────────────────────────────────────────────────

// ─── Filter chip ─────────────────────────────────────────────────────────────

const FilterChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [
      fc.chip,
      active && fc.chipActive,
      pressed && fc.pressed,
    ]}
    onPress={onPress}
  >
    <Typography
      variant="caption"
      style={active ? [fc.label, fc.labelActive] : fc.label}
    >
      {label}
    </Typography>
  </Pressable>
);

const fc = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  chipActive: {
    backgroundColor: colors.accent + "22",
    borderColor: colors.accent,
  } as ViewStyle,
  pressed: { opacity: 0.6 } as ViewStyle,
  label: { color: colors.textSecondary } as TextStyle,
  labelActive: { color: colors.accent, fontWeight: "700" } as TextStyle,
});

// ─── Account picker sheet ─────────────────────────────────────────────────────

const AccountSheet = ({
  accounts,
  selected,
  onToggle,
  insetBottom,
}: {
  accounts: Account[];
  selected: string[];
  onToggle: (id: string) => void;
  insetBottom: number;
}) => {
  const { t } = useTranslation();
  return (
    <BottomSheetScrollView
      contentContainerStyle={[asp.content, { paddingBottom: insetBottom + 16 }]}
    >
      <Typography variant="label" style={asp.title}>
        {t("transactions.filterAccounts")}
      </Typography>
      {accounts.map((acc) => {
        const cfg = getAccountTypeConfig(acc.type);
        const iconName = (acc.icon ?? cfg.icon) as React.ComponentProps<
          typeof Ionicons
        >["name"];
        const iconBg = acc.color ?? cfg.color;
        const isSelected = selected.includes(acc.id);
        return (
          <Pressable
            key={acc.id}
            style={({ pressed }) => [asp.row, pressed && asp.pressed]}
            onPress={() => onToggle(acc.id)}
          >
            <View style={[asp.icon, { backgroundColor: iconBg }]}>
              <Ionicons
                name={iconName}
                size={18}
                color={getIconColor(iconBg)}
              />
            </View>
            <Typography variant="body" style={asp.flex}>
              {acc.name}
            </Typography>
            {isSelected && (
              <Ionicons name="checkmark" size={18} color={colors.accent} />
            )}
          </Pressable>
        );
      })}
    </BottomSheetScrollView>
  );
};

const asp = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4 } as ViewStyle,
  title: { fontWeight: "700", marginBottom: 12, marginTop: 8 } as TextStyle,
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  } as ViewStyle,
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  flex: { flex: 1 } as TextStyle,
  pressed: { opacity: 0.6 } as ViewStyle,
});

// Virtual category IDs (not real DB ids)
export const VIRTUAL_CATEGORY_UNCATEGORIZED = "__uncategorized__";
export const VIRTUAL_CATEGORY_BALANCE_CORRECTION = "balance_correction";

// ─── Category picker sheet ────────────────────────────────────────────────────

const CategorySheet = ({
  categories,
  selected,
  onToggle,
  insetBottom,
}: {
  categories: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    translationKey: string | null;
  }[];
  selected: string[];
  onToggle: (id: string) => void;
  insetBottom: number;
}) => {
  const { t } = useTranslation();

  const specialCategories = [
    {
      id: VIRTUAL_CATEGORY_UNCATEGORIZED,
      name: t("analytics.uncategorised"),
      icon: "help-outline" as const,
      color: colors.backgroundSurfaceAlt,
    },
    {
      id: VIRTUAL_CATEGORY_BALANCE_CORRECTION,
      name: t("addTransaction.balanceCorrection"),
      icon: "scale-outline" as const,
      color: colors.backgroundSurfaceAlt,
    },
  ];

  return (
    <BottomSheetScrollView
      contentContainerStyle={[asp.content, { paddingBottom: insetBottom + 16 }]}
    >
      <Typography variant="label" style={asp.title}>
        {t("transactions.filterCategories")}
      </Typography>
      {specialCategories.map((cat) => {
        const isSelected = selected.includes(cat.id);
        return (
          <Pressable
            key={cat.id}
            style={({ pressed }) => [asp.row, pressed && asp.pressed]}
            onPress={() => onToggle(cat.id)}
          >
            <View style={[asp.icon, { backgroundColor: cat.color }]}>
              <Ionicons name={cat.icon} size={18} color={colors.textTertiary} />
            </View>
            <Typography variant="body" style={asp.flex}>
              {cat.name}
            </Typography>
            {isSelected && (
              <Ionicons name="checkmark" size={18} color={colors.accent} />
            )}
          </Pressable>
        );
      })}
      {categories.map((cat) => {
        const isSelected = selected.includes(cat.id);
        const bg = cat.color ?? colors.backgroundSurface;
        return (
          <Pressable
            key={cat.id}
            style={({ pressed }) => [asp.row, pressed && asp.pressed]}
            onPress={() => onToggle(cat.id)}
          >
            <View style={[asp.icon, { backgroundColor: bg }]}>
              <Ionicons
                name={
                  (cat.icon ?? "help") as React.ComponentProps<
                    typeof Ionicons
                  >["name"]
                }
                size={18}
                color="#fff"
              />
            </View>
            <Typography variant="body" style={asp.flex}>
              {getCategoryDisplayName(cat, t)}
            </Typography>
            {isSelected && (
              <Ionicons name="checkmark" size={18} color={colors.accent} />
            )}
          </Pressable>
        );
      })}
    </BottomSheetScrollView>
  );
};

// ─── Tag picker sheet ─────────────────────────────────────────────────────────

const TagSheet = ({
  tags,
  selected,
  onToggle,
  insetBottom,
}: {
  tags: { id: string; name: string; color: string | null }[];
  selected: string[];
  onToggle: (id: string) => void;
  insetBottom: number;
}) => {
  const { t } = useTranslation();
  return (
    <BottomSheetScrollView
      contentContainerStyle={[asp.content, { paddingBottom: insetBottom + 16 }]}
    >
      <Typography variant="label" style={asp.title}>
        {t("transactions.filterTags")}
      </Typography>
      {tags.map((tag) => {
        const isSelected = selected.includes(tag.id);
        const bg = tag.color ?? colors.backgroundSurface;
        return (
          <Pressable
            key={tag.id}
            style={({ pressed }) => [asp.row, pressed && asp.pressed]}
            onPress={() => onToggle(tag.id)}
          >
            <View style={[asp.icon, { backgroundColor: bg }]}>
              <Ionicons name="bookmark" size={16} color={getIconColor(bg)} />
            </View>
            <Typography variant="body" style={asp.flex}>
              {tag.name}
            </Typography>
            {isSelected && (
              <Ionicons name="checkmark" size={18} color={colors.accent} />
            )}
          </Pressable>
        );
      })}
    </BottomSheetScrollView>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const TransactionsScreen = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const workspaceId = useWorkspaceStore((s) => s.id);

  // ── URL params (pre-filters from other screens) ──────────────────────────────
  const params = useLocalSearchParams<{
    accountIds?: string;
    categoryId?: string;
    categoryName?: string;
    tagId?: string;
    tagName?: string;
    datePreset?: string;
    search?: string;
    // virtual category flags
    uncategorized?: string;
    balanceCorrection?: string;
  }>();

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState(params.search ?? "");
  const [showSearch, setShowSearch] = useState(!!params.search);
  const [datePreset, setDatePreset] = useState<DatePreset | null>(
    (params.datePreset as DatePreset) ?? null,
  );
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    params.accountIds ? params.accountIds.split(",").filter(Boolean) : [],
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    () => {
      const ids: string[] = [];
      if (params.categoryId) ids.push(params.categoryId);
      if (params.uncategorized === "1")
        ids.push(VIRTUAL_CATEGORY_UNCATEGORIZED);
      if (params.balanceCorrection === "1")
        ids.push(VIRTUAL_CATEGORY_BALANCE_CORRECTION);
      return ids;
    },
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    params.tagId ? [params.tagId] : [],
  );

  // ── Sheet refs ───────────────────────────────────────────────────────────────
  const dateSheetRef = useRef<BottomSheetModal>(null);
  const accountSheetRef = useRef<BottomSheetModal>(null);
  const categorySheetRef = useRef<BottomSheetModal>(null);
  const tagSheetRef = useRef<BottomSheetModal>(null);
  const { runWithGuard } = useSinglePressGuard();

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data: accounts = [] } = useAccounts(workspaceId);
  const { data: allCategories = [] } = useCategories(workspaceId);
  const { data: allTags = [] } = useTags(workspaceId);

  const dateRange = datePreset
    ? getDateRange(datePreset)
    : { from: undefined, to: undefined };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteTransactions({
      workspaceId,
      accountIds:
        selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
      categoryIds:
        selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      search: search.trim() || undefined,
      fromDate: dateRange.from,
      toDate: dateRange.to,
    });

  // ── Flattened + grouped list data ─────────────────────────────────────────────
  const locale = i18n.language.startsWith("uk") ? "uk-UA" : "en-US";
  const allTxs = useMemo(() => data?.pages.flatMap((p) => p) ?? [], [data]);
  const listData = useMemo(() => buildList(allTxs, locale), [allTxs, locale]);

  // ── Toggle helpers ───────────────────────────────────────────────────────────
  const toggleAccount = useCallback((id: string) => {
    haptic();
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleCategory = useCallback((id: string) => {
    haptic();
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleTag = useCallback((id: string) => {
    haptic();
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clearAll = useCallback(() => {
    haptic();
    setSelectedAccountIds([]);
    setSelectedCategoryIds([]);
    setSelectedTagIds([]);
    setDatePreset(null);
    setSearch("");
  }, []);

  const openAdd = useCallback(() => {
    runWithGuard(() => {
      haptic();
      router.push("/(modals)/add-transaction" as never);
    });
  }, [runWithGuard]);

  const hasFilters =
    selectedAccountIds.length > 0 ||
    selectedCategoryIds.length > 0 ||
    selectedTagIds.length > 0 ||
    datePreset !== null ||
    search.trim().length > 0;

  // ── Date chip label ──────────────────────────────────────────────────────────
  const dateChipLabel = useMemo(() => {
    if (!datePreset) return t("transactions.dateFilter");
    return t(`analytics.datePresets.${datePreset}`);
  }, [datePreset, t]);

  // ── Backdrop ─────────────────────────────────────────────────────────────────
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  // ── List render ──────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      if (item._type === "header") {
        return (
          <View style={s.dateHeader}>
            <Typography
              variant="caption"
              color="textTertiary"
              style={s.dateHeaderText}
            >
              {item.label}
            </Typography>
          </View>
        );
      }
      // Determine whether this tx is the first in its date group
      const prevItem = listData[index - 1];
      const isFirstInGroup = !prevItem || prevItem._type === "header";
      return (
        <View
          style={[
            s.txCardWrap,
            isFirstInGroup && s.txCardFirst,
            item.isLast && s.txCardLast,
          ]}
        >
          <TransactionItem
            tx={item.tx}
            accountId={item.tx.account.id}
            isLast={item.isLast}
          />
        </View>
      );
    },
    [listData],
  );

  const keyExtractor = useCallback((item: ListItem) => {
    if (item._type === "header") return `h-${item.date}`;
    return item.tx.id;
  }, []);

  const getItemType = useCallback((item: ListItem) => item._type, []);

  const ListFooter = useCallback(() => {
    if (!hasNextPage && !isFetchingNextPage)
      return <View style={{ height: 32 }} />;
    return (
      <View style={s.footer}>
        <Typography variant="caption" color="textTertiary">
          {t("common.loading")}…
        </Typography>
      </View>
    );
  }, [hasNextPage, isFetchingNextPage, t]);

  const ListEmpty = useCallback(() => {
    if (isLoading) return <CategoryRowsSkeleton count={8} />;
    return (
      <View style={s.empty}>
        <Ionicons
          name="receipt-outline"
          size={40}
          color={colors.textTertiary}
        />
        <Typography variant="body" color="textSecondary" style={s.emptyText}>
          {t("transactions.empty")}
        </Typography>
      </View>
    );
  }, [isLoading, t]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && s.pressed]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Typography variant="h3" style={s.headerTitle}>
          {t("transactions.title")}
        </Typography>
        <Pressable
          style={({ pressed }) => [
            s.searchBtn,
            showSearch && s.searchBtnActive,
            pressed && s.pressed,
          ]}
          onPress={() => {
            haptic();
            setShowSearch((v) => !v);
            if (showSearch) setSearch("");
          }}
          hitSlop={8}
        >
          <Ionicons
            name={showSearch ? "close" : "search"}
            size={20}
            color={showSearch ? colors.accent : colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      {showSearch && (
        <View style={s.searchRow}>
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t("transactions.searchPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      )}

      {/* ── Filter chips ────────────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipsScroll}
        contentContainerStyle={s.chipsRow}
      >
        <FilterChip
          label={dateChipLabel}
          active={datePreset !== null}
          onPress={() => {
            haptic();
            dateSheetRef.current?.present();
          }}
        />
        <FilterChip
          label={
            selectedAccountIds.length > 0
              ? t("transactions.accountsCount", {
                  count: selectedAccountIds.length,
                })
              : t("transactions.accounts")
          }
          active={selectedAccountIds.length > 0}
          onPress={() => {
            haptic();
            accountSheetRef.current?.present();
          }}
        />
        <FilterChip
          label={
            selectedCategoryIds.length > 0
              ? t("transactions.categoriesCount", {
                  count: selectedCategoryIds.length,
                })
              : t("analytics.categories")
          }
          active={selectedCategoryIds.length > 0}
          onPress={() => {
            haptic();
            categorySheetRef.current?.present();
          }}
        />
        <FilterChip
          label={
            selectedTagIds.length > 0
              ? t("transactions.tagsCount", { count: selectedTagIds.length })
              : t("analytics.tags")
          }
          active={selectedTagIds.length > 0}
          onPress={() => {
            haptic();
            tagSheetRef.current?.present();
          }}
        />
        {hasFilters && (
          <Pressable
            style={({ pressed }) => [s.clearBtn, pressed && s.pressed]}
            onPress={clearAll}
            hitSlop={4}
          >
            <Ionicons
              name="close-circle"
              size={16}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
      </ScrollView>

      {/* ── Transaction list ─────────────────────────────────────────────────── */}
      <View style={s.listContainer}>
        <FlashList
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemType={getItemType}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <FabAddButton onPress={openAdd} bottom={insets.bottom + 20} />

      {/* ── Date sheet ───────────────────────────────────────────────────────── */}
      <BottomSheetModal
        ref={dateSheetRef}
        enableDynamicSizing
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.sheetHandle}
        backdropComponent={renderBackdrop}
      >
        <DatePickerSheet
          selected={datePreset}
          onSelect={setDatePreset}
          sheetRef={dateSheetRef}
          allowNull
        />
      </BottomSheetModal>

      {/* ── Account sheet ────────────────────────────────────────────────────── */}
      <BottomSheetModal
        ref={accountSheetRef}
        enableDynamicSizing
        maxDynamicContentSize={SHEET_MAX_HEIGHT}
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.sheetHandle}
        backdropComponent={renderBackdrop}
      >
        <AccountSheet
          accounts={accounts}
          selected={selectedAccountIds}
          onToggle={toggleAccount}
          insetBottom={insets.bottom}
        />
      </BottomSheetModal>

      {/* ── Category sheet ───────────────────────────────────────────────────── */}
      <BottomSheetModal
        ref={categorySheetRef}
        enableDynamicSizing
        maxDynamicContentSize={SHEET_MAX_HEIGHT}
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.sheetHandle}
        backdropComponent={renderBackdrop}
      >
        <CategorySheet
          categories={allCategories}
          selected={selectedCategoryIds}
          onToggle={toggleCategory}
          insetBottom={insets.bottom}
        />
      </BottomSheetModal>

      {/* ── Tag sheet ────────────────────────────────────────────────────────── */}
      <BottomSheetModal
        ref={tagSheetRef}
        enableDynamicSizing
        maxDynamicContentSize={SHEET_MAX_HEIGHT}
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.sheetHandle}
        backdropComponent={renderBackdrop}
      >
        <TagSheet
          tags={allTags}
          selected={selectedTagIds}
          onToggle={toggleTag}
          insetBottom={insets.bottom}
        />
      </BottomSheetModal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  } as ViewStyle,
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  headerTitle: {
    flex: 1,
    fontWeight: "700",
  } as TextStyle,
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  searchBtnActive: {
    backgroundColor: colors.accent + "22",
  } as ViewStyle,
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  } as TextStyle,
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  } as ViewStyle,
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  } as ViewStyle,
  listContainer: {
    flex: 1,
  } as ViewStyle,
  clearBtn: {
    padding: 2,
  } as ViewStyle,
  dateHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  } as ViewStyle,
  dateHeaderText: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 11,
    fontWeight: "600",
  } as TextStyle,
  txCardWrap: {
    marginHorizontal: 16,
    backgroundColor: colors.backgroundElevated,
    overflow: "hidden",
  } as ViewStyle,
  txCardFirst: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  } as ViewStyle,
  txCardLast: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  } as ViewStyle,
  footer: {
    alignItems: "center",
    paddingVertical: 16,
  } as ViewStyle,
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  } as ViewStyle,
  emptyText: {
    textAlign: "center",
  } as TextStyle,
  sheetBg: { backgroundColor: colors.backgroundElevated } as ViewStyle,
  sheetHandle: { backgroundColor: colors.border } as ViewStyle,
  pressed: { opacity: 0.6 } as ViewStyle,
});

export default TransactionsScreen;
