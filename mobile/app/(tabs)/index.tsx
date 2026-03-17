import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useRef, useState, useCallback, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import * as Haptics from "expo-haptics";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { colors } from "@constants/colors";
import { getCurrencySymbol } from "@constants/account-types";
import { getCategoryDisplayName } from "@constants/default-categories";
import { getIconColor } from "@constants/icon-list";
import { Typography } from "@components/ui/Typography";
import { useAccounts } from "@services/accounts/accounts.queries";
import { useTransactionStats } from "@services/transactions/transactions.queries";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { usePickerStore } from "@stores/usePickerStore";
import type {
  CategoryStat,
  TagStat,
} from "@services/transactions/transactions.api";
import {
  StatCardSkeleton,
  CategoryRowsSkeleton,
} from "@components/ui/Skeleton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Date helpers ──────────────────────────────────────────────────────────────

type DatePreset =
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "thisYear"
  | "allTime";

const getDateRange = (preset: DatePreset) => {
  const now = DateTime.now();
  switch (preset) {
    case "thisMonth":
      return { from: now.startOf("month").toISODate()!, to: now.toISODate()! };
    case "lastMonth": {
      const lastMonth = now.minus({ months: 1 });
      return {
        from: lastMonth.startOf("month").toISODate()!,
        to: lastMonth.endOf("month").toISODate()!,
      };
    }
    case "last3Months":
      return {
        from: now.minus({ months: 2 }).startOf("month").toISODate()!,
        to: now.toISODate()!,
      };
    case "thisYear":
      return { from: now.startOf("year").toISODate()!, to: now.toISODate()! };
    case "allTime":
      return { from: undefined, to: undefined };
  }
};

const fmtAmount = (n: number, currency: string) => {
  const sym = getCurrencySymbol(currency);
  return (
    Math.abs(n).toLocaleString("uk-UA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    " " +
    sym
  );
};

// ─── Stat card ─────────────────────────────────────────────────────────────────

const EMOJIS: Record<"expense" | "income", string[]> = {
  expense: ["💸", "🛒", "🤙", "😤", "🔥"],
  income: ["💰", "🎉", "🤔", "😊", "🙌"],
};

const StatCard = ({
  type,
  data,
  currency,
}: {
  type: "expense" | "income";
  data: {
    total: number;
    count: number;
    byCategory: CategoryStat[];
    byTag: TagStat[];
  };
  currency: string;
}) => {
  const { t } = useTranslation();
  const isExpense = type === "expense";
  const emoji = EMOJIS[type][data.count % EMOJIS[type].length];
  const catCount = data.byCategory.length;
  const tagCount = data.byTag.length;

  return (
    <View style={sc.card}>
      <View style={sc.topRow}>
        <View
          style={[
            sc.typeCircle,
            { backgroundColor: isExpense ? colors.error : colors.success },
          ]}
        >
          <Ionicons
            name={isExpense ? "arrow-up-outline" : "arrow-down-outline"}
            size={20}
            color={getIconColor(isExpense ? colors.error : colors.success)}
          />
        </View>
        <View style={sc.currencyBadge}>
          <Typography variant="caption" color="textSecondary">
            {currency}
          </Typography>
        </View>
      </View>

      <Typography variant="caption" color="textSecondary" style={sc.label}>
        {isExpense ? t("analytics.expenses") : t("analytics.income")}
      </Typography>

      <Typography
        variant="h1"
        style={[sc.amount, isExpense ? sc.amountExpense : sc.amountIncome]}
      >
        {isExpense ? "-" : "+"}
        {fmtAmount(data.total, currency)}
      </Typography>

      <View style={sc.hintBox}>
        <Typography variant="caption" color="textSecondary">
          {emoji} {t("analytics.transactionsCount", { count: data.count })}
        </Typography>
      </View>

      <View style={sc.statsRow}>
        <View style={sc.statBox}>
          <Ionicons
            name="grid-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Typography variant="h3">{catCount}</Typography>
          <Typography variant="caption" color="textSecondary">
            {t("analytics.categoriesCount_other", { count: catCount })}
          </Typography>
        </View>
        <View style={sc.statBox}>
          <Ionicons
            name="bookmark-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Typography variant="h3">{tagCount}</Typography>
          <Typography variant="caption" color="textSecondary">
            {t("analytics.tagsCount_other", { count: tagCount })}
          </Typography>
        </View>
      </View>
    </View>
  );
};

const sc = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 32,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 18,
    borderCurve: "continuous",
    padding: 16,
    marginHorizontal: 16,
    gap: 10,
  } as ViewStyle,
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as ViewStyle,
  typeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  currencyBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  } as ViewStyle,
  label: { marginTop: 2 } as TextStyle,
  amount: { fontSize: 32, fontWeight: "700" } as TextStyle,
  amountExpense: { color: colors.error } as TextStyle,
  amountIncome: { color: colors.textPrimary } as TextStyle,
  hintBox: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  } as ViewStyle,
  statsRow: { flexDirection: "row", gap: 10 } as ViewStyle,
  statBox: {
    flex: 1,
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 12,
    gap: 4,
  } as ViewStyle,
});

// ─── Category row ──────────────────────────────────────────────────────────────

const CategoryRow = ({
  item,
  currency,
  isFirst,
  isLast,
}: {
  item: CategoryStat;
  currency: string;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const { t } = useTranslation();
  const name = item.categoryId
    ? getCategoryDisplayName(
        {
          name: item.categoryName ?? "",
          translationKey: item.categoryTranslationKey,
        },
        t,
      )
    : t("analytics.uncategorised");
  const bg = item.color ?? colors.iconBlue;

  return (
    <View
      style={[
        cr.row,
        isFirst && cr.firstRow,
        isLast && cr.lastRow,
        !isLast && cr.divider,
      ]}
    >
      <View style={[cr.icon, { backgroundColor: bg }]}>
        <Ionicons
          name={
            (item.icon as React.ComponentProps<typeof Ionicons>["name"]) ??
            "pricetag-outline"
          }
          size={18}
          color={getIconColor(bg)}
        />
      </View>
      <View style={cr.info}>
        <Typography variant="label">{name}</Typography>
        <Typography variant="caption" color="textSecondary">
          {item.count} {item.count === 1 ? "транзакція" : "транзакцій"}
        </Typography>
      </View>
      <View style={cr.right}>
        <Typography variant="label">
          {fmtAmount(item.total, currency)}
        </Typography>
        <Typography variant="caption" color="textSecondary" style={cr.pct}>
          {item.percent}%
        </Typography>
      </View>
    </View>
  );
};

const cr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  info: { flex: 1, gap: 2 } as ViewStyle,
  right: { alignItems: "flex-end", gap: 2 } as ViewStyle,
  pct: { textAlign: "right" } as TextStyle,
});

// ─── Tag row ───────────────────────────────────────────────────────────────────

const TagRow = ({
  item,
  currency,
  isFirst,
  isLast,
}: {
  item: TagStat;
  currency: string;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const { t } = useTranslation();
  const bg = item.color ?? colors.iconTeal;

  return (
    <View
      style={[
        cr.row,
        isFirst && cr.firstRow,
        isLast && cr.lastRow,
        !isLast && cr.divider,
      ]}
    >
      <View style={[cr.icon, { backgroundColor: bg }]}>
        <Ionicons name="bookmark" size={16} color={getIconColor(bg)} />
      </View>
      <View style={cr.info}>
        <Typography variant="label">{item.tagName}</Typography>
        <Typography variant="caption" color="textSecondary">
          {t("analytics.transactionsCount", { count: item.count })}
        </Typography>
      </View>
      <View style={cr.right}>
        <Typography variant="label">
          {fmtAmount(item.total, currency)}
        </Typography>
        <Typography variant="caption" color="textSecondary" style={cr.pct}>
          {item.percent}%
        </Typography>
      </View>
    </View>
  );
};

// ─── Date preset sheet ─────────────────────────────────────────────────────────

const DATE_PRESETS: DatePreset[] = [
  "thisMonth",
  "lastMonth",
  "last3Months",
  "thisYear",
  "allTime",
];

const DateSheet = ({
  selected,
  onSelect,
  sheetRef,
}: {
  selected: DatePreset;
  onSelect: (p: DatePreset) => void;
  sheetRef: React.RefObject<BottomSheetModal | null>;
}) => {
  const { t } = useTranslation();
  return (
    <BottomSheetView>
      {DATE_PRESETS.map((preset, i) => (
        <Pressable
          key={preset}
          style={({ pressed }) => [
            ds.row,
            i < DATE_PRESETS.length - 1 && ds.divider,
            pressed && ds.pressed,
          ]}
          onPress={() => {
            onSelect(preset);
            sheetRef.current?.dismiss();
          }}
        >
          <Typography variant="body">
            {t(`analytics.datePresets.${preset}`)}
          </Typography>
          {preset === selected && (
            <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
          )}
        </Pressable>
      ))}
    </BottomSheetView>
  );
};

const ds = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 16,
  } as ViewStyle,
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  } as ViewStyle,
  pressed: { opacity: 0.6 } as ViewStyle,
});

// ─── Main screen ───────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const workspaceId = useWorkspaceStore((s) => s.id);
  const workspaceName = useWorkspaceStore((s) => s.name);
  const initial = workspaceName ? workspaceName.charAt(0).toUpperCase() : "W";

  const { data: accounts = [] } = useAccounts(workspaceId);

  const [datePreset, setDatePreset] = useState<DatePreset>("thisMonth");
  const { from: fromDate, to: toDate } = getDateRange(datePreset);

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [activePage, setActivePage] = useState(0);
  const [activeTab, setActiveTab] = useState<"categories" | "tags">(
    "categories",
  );
  const [cardsHeight, setCardsHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [stickyTabHeight, setStickyTabHeight] = useState(0);

  const dateSheetRef = useRef<BottomSheetModal>(null);

  useFocusEffect(
    useCallback(() => {
      const store = usePickerStore.getState();
      if (store.selectedAccountIds !== null) {
        setSelectedAccountIds(store.selectedAccountIds);
        usePickerStore.setState({ selectedAccountIds: null });
      }
    }, []),
  );
  const pagerRef = useRef<ScrollView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const isSnapping = useRef(false);
  const snapTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: stats, isLoading } = useTransactionStats(
    workspaceId,
    fromDate,
    toDate,
    selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
  );

  const currency = stats?.currency ?? "UAH";

  const activeStat = useMemo(
    () => (activePage === 0 ? stats?.expenses : stats?.income),
    [activePage, stats],
  );
  const categories = activeStat?.byCategory ?? [];
  const tags = activeStat?.byTag ?? [];

  const formatDateRange = useCallback(
    (from?: string, to?: string): string => {
      const locale = i18n.language;
      if (!from && !to) return t("analytics.datePresets.allTime");
      const fmt = (s: string) =>
        DateTime.fromISO(s)
          .setLocale(locale)
          .toLocaleString({ day: "numeric", month: "long", year: "numeric" });
      if (!from) return `— ${fmt(to!)}`;
      if (!to) return `${fmt(from)} —`;
      return `${fmt(from)} – ${fmt(to)}`;
    },
    [i18n.language, t],
  );

  const accountLabel = useMemo(() => {
    if (selectedAccountIds.length === 0) return t("analytics.allAccounts");
    const names = selectedAccountIds
      .map((id) => accounts.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    return names || t("analytics.allAccounts");
  }, [selectedAccountIds, accounts, t]);

  const onCardsLayout = useCallback((e: LayoutChangeEvent) => {
    setCardsHeight(e.nativeEvent.layout.height);
  }, []);

  const onScrollViewLayout = useCallback((e: LayoutChangeEvent) => {
    setScrollViewHeight(e.nativeEvent.layout.height);
  }, []);

  const onStickyTabLayout = useCallback((e: LayoutChangeEvent) => {
    setStickyTabHeight(e.nativeEvent.layout.height);
  }, []);

  const bottomPadding = insets.bottom + 110;
  const catMinHeight =
    scrollViewHeight > 0
      ? scrollViewHeight - stickyTabHeight - bottomPadding
      : 0;

  const snapTo = useCallback((target: number) => {
    isSnapping.current = true;
    clearTimeout(snapTimeout.current);
    snapTimeout.current = setTimeout(() => {
      isSnapping.current = false;
    }, 500);
    scrollRef.current?.scrollTo({ y: target, animated: true });
  }, []);

  const getSnapTarget = useCallback(
    (y: number, vy: number) => {
      if (Math.abs(vy) > 0.3) return vy > 0 ? cardsHeight : 0;
      return y < cardsHeight / 2 ? 0 : cardsHeight;
    },
    [cardsHeight],
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (cardsHeight <= 0 || isSnapping.current) return;
      const y = e.nativeEvent.contentOffset.y;
      const vy = e.nativeEvent.velocity?.y ?? 0;
      if (y > 1 && y < cardsHeight - 1) {
        snapTo(getSnapTarget(y, vy));
      }
    },
    [cardsHeight, snapTo, getSnapTarget],
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isSnapping.current) {
        isSnapping.current = false;
        clearTimeout(snapTimeout.current);
        return;
      }
      if (cardsHeight <= 0) return;
      const y = e.nativeEvent.contentOffset.y;
      if (y > 1 && y < cardsHeight - 1) {
        snapTo(y < cardsHeight / 2 ? 0 : cardsHeight);
      }
    },
    [cardsHeight, snapTo],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    [],
  );

  const openAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push("/(modals)/add-transaction" as never);
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.workspacePill}>
          <View style={s.wsCircle}>
            <Typography
              variant="caption"
              color="textOnAccent"
              style={s.wsLetter}
            >
              {initial}
            </Typography>
          </View>
          <Typography variant="label">{workspaceName}</Typography>
        </View>
        <View style={s.headerIcon}>
          <Ionicons
            name="layers-outline"
            size={20}
            color={colors.textPrimary}
          />
        </View>
      </View>

      {/* ── Date bar ───────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [s.dateBar, pressed && s.pressed]}
        onPress={() => dateSheetRef.current?.present()}
      >
        <Typography variant="caption" color="textSecondary">
          {formatDateRange(fromDate, toDate)}
        </Typography>
        <Ionicons
          name="calendar-outline"
          size={15}
          color={colors.textSecondary}
        />
      </Pressable>

      {/* ── Scrollable body ────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        onLayout={onScrollViewLayout}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {/* child 0 — collapsible pager section */}
        <View onLayout={onCardsLayout}>
          {/* Account card */}
          <Pressable
            style={({ pressed }) => [s.accountCard, pressed && s.pressed]}
            onPress={() => {
              const param = selectedAccountIds.join(",");
              router.push(
                `/(modals)/account-picker${param ? `?selected=${param}` : ""}` as never,
              );
            }}
          >
            <View style={s.accountLeft}>
              <View style={s.accountIconBox}>
                <Ionicons
                  name="card-outline"
                  size={18}
                  color={colors.textPrimary}
                />
              </View>
              <Typography
                variant="label"
                numberOfLines={2}
                ellipsizeMode="tail"
                style={s.accountLabel}
              >
                {accountLabel}
              </Typography>
            </View>
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          {/* Horizontal stat pager */}
          {isLoading ? (
            <StatCardSkeleton />
          ) : (
            <ScrollView
              ref={pagerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const page = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                );
                setActivePage(page);
              }}
            >
              <StatCard
                type="expense"
                data={
                  stats?.expenses ?? {
                    total: 0,
                    count: 0,
                    byCategory: [],
                    byTag: [],
                  }
                }
                currency={currency}
              />
              <StatCard
                type="income"
                data={
                  stats?.income ?? {
                    total: 0,
                    count: 0,
                    byCategory: [],
                    byTag: [],
                  }
                }
                currency={currency}
              />
            </ScrollView>
          )}

          {/* Pager dots */}
          <View style={s.dots}>
            {[0, 1].map((i) => (
              <Pressable
                key={i}
                hitSlop={8}
                onPress={() =>
                  pagerRef.current?.scrollTo({
                    x: i * SCREEN_WIDTH,
                    animated: true,
                  })
                }
                style={[s.dot, activePage === i && s.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* child 1 — STICKY tab bar
             The outer wrapper spans the full scroll width and carries the
             screen background, so category rows can't bleed through the sides
             or the gap below when the bar is stuck to the top. */}
        <View style={s.tabBarWrapper} onLayout={onStickyTabLayout}>
          <View style={s.tabBar}>
            {(["categories", "tags"] as const).map((tab) => (
              <Pressable
                key={tab}
                style={[s.tab, activeTab === tab && s.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Typography
                  variant="label"
                  color={activeTab === tab ? "textPrimary" : "textSecondary"}
                >
                  {tab === "categories"
                    ? t("analytics.categories")
                    : t("analytics.tags")}
                </Typography>
              </Pressable>
            ))}
          </View>
        </View>

        {/* child 2 — category/tag list (minHeight ensures snap can always reach tabs) */}
        <View
          style={[
            s.catSection,
            catMinHeight > 0 && { minHeight: catMinHeight },
          ]}
        >
          {isLoading ? (
            <CategoryRowsSkeleton count={4} />
          ) : activeTab === "categories" ? (
            categories.length === 0 ? (
              <View style={s.empty}>
                <Typography variant="body" color="textSecondary">
                  {t("analytics.noData")}
                </Typography>
              </View>
            ) : (
              categories.map((cat, i) => (
                <CategoryRow
                  key={cat.categoryId ?? `cat-${i}`}
                  item={cat}
                  currency={currency}
                  isFirst={i === 0}
                  isLast={i === categories.length - 1}
                />
              ))
            )
          ) : tags.length === 0 ? (
            <View style={s.empty}>
              <Typography variant="body" color="textSecondary">
                {t("analytics.noData")}
              </Typography>
            </View>
          ) : (
            tags.map((tag, i) => (
              <TagRow
                key={tag.tagId}
                item={tag}
                currency={currency}
                isFirst={i === 0}
                isLast={i === tags.length - 1}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── FAB ────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          s.fab,
          { bottom: 20 },
          pressed && s.fabPressed,
        ]}
        onPress={openAdd}
      >
        <Ionicons name="add" size={28} color={colors.textOnAccent} />
      </Pressable>

      {/* ── Date sheet ─────────────────────────────────── */}
      <BottomSheetModal
        ref={dateSheetRef}
        enableDynamicSizing
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.sheetHandle}
        backdropComponent={renderBackdrop}
      >
        <DateSheet
          selected={datePreset}
          onSelect={setDatePreset}
          sheetRef={dateSheetRef}
        />
      </BottomSheetModal>
    </View>
  );
};

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  } as ViewStyle,
  workspacePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  wsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  wsLetter: {
    fontSize: 14,
    fontWeight: "700",
  } as TextStyle,
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  // Date bar
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 10,
  } as ViewStyle,
  // Scroll
  scroll: { flex: 1 } as ViewStyle,
  // Account card
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  } as ViewStyle,
  accountLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  } as ViewStyle,
  accountLabel: {
    flex: 1,
  } as TextStyle,
  accountIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  // Pager dots
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    paddingVertical: 10,
  } as ViewStyle,
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
  } as ViewStyle,
  dotActive: {
    width: 20,
    backgroundColor: colors.textPrimary,
  } as ViewStyle,
  // Sticky tab bar
  tabBarWrapper: {
    // Full-width background covers any content scrolling behind the sticky bar
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 2,
  } as ViewStyle,
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    borderCurve: "continuous",
    padding: 3,
  } as ViewStyle,
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  } as ViewStyle,
  tabActive: {
    backgroundColor: colors.background,
  } as ViewStyle,
  // Categories
  catSection: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
  empty: {
    padding: 24,
    alignItems: "center",
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  // FAB
  fab: {
    position: "absolute",
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    // Accent-coloured glow
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 12,
  } as ViewStyle,
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.95 }],
  } as ViewStyle,
  // Sheets
  sheetBg: {
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  sheetHandle: {
    backgroundColor: colors.textTertiary,
  } as ViewStyle,
  pressed: { opacity: 0.6 } as ViewStyle,
});

export default HomeScreen;
