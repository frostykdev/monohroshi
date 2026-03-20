import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useState, useMemo, useCallback, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import {
  DonutChart,
  type DonutChartDataPoint,
  type ProcessedSegment,
} from "expo-skia-charts";
import { colors } from "@constants/colors";
import { getCurrencySymbol } from "@constants/account-types";
import { getCategoryDisplayName } from "@constants/default-categories";
import { getIconColor } from "@constants/icon-list";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { SegmentedControl } from "@components/ui/SegmentedControl";
import type { Segment } from "@components/ui/SegmentedControl";
import { useTransactionStats } from "@services/transactions/transactions.queries";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { CategoryRowsSkeleton } from "@components/ui/Skeleton";
import type {
  CategoryStat,
  TagStat,
} from "@services/transactions/transactions.api";

// ─── Date helpers ──────────────────────────────────────────────────────────────

type DatePreset =
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "thisYear"
  | "allTime";

const DATE_PRESETS: DatePreset[] = [
  "thisMonth",
  "lastMonth",
  "last3Months",
  "thisYear",
  "allTime",
];

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtAmount = (n: number, currency: string) => {
  const sym = getCurrencySymbol(currency);
  return (
    Math.abs(n).toLocaleString("uk-UA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) +
    " " +
    sym
  );
};

const FALLBACK_COLORS = [
  colors.iconBlue,
  colors.iconPurple,
  colors.iconTeal,
  colors.warning,
  colors.success,
  colors.error,
];

// ─── Date sheet ────────────────────────────────────────────────────────────────

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

// ─── Donut chart ───────────────────────────────────────────────────────────────

const StatsDonutChart = ({
  items,
  currency,
  isCategory,
  t,
}: {
  items: (CategoryStat | TagStat)[];
  currency: string;
  isCategory: boolean;
  t: ReturnType<typeof useTranslation>["t"];
}) => {
  if (items.length === 0) return null;

  const data: DonutChartDataPoint[] = items.map((item) => ({
    label: isCategory
      ? getCategoryDisplayName(
          {
            name: (item as CategoryStat).categoryName ?? "",
            translationKey: (item as CategoryStat).categoryTranslationKey,
          },
          t,
        )
      : (item as TagStat).tagName,
    value: item.total,
  }));

  const chartColors = items.map(
    (item, i) => item.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  );

  const renderCenter = (
    _segments: ProcessedSegment[],
    total: number,
    hovered: ProcessedSegment | null,
  ) => (
    <View style={ch.center}>
      <Typography variant="h3" style={ch.centerAmount}>
        {fmtAmount(hovered?.value ?? total, currency)}
      </Typography>
      <Typography
        variant="bodySmall"
        color={hovered ? "textPrimary" : "textSecondary"}
        style={ch.centerLabel}
        numberOfLines={2}
      >
        {hovered ? hovered.label : t("analytics.total")}
      </Typography>
      {hovered && (
        <Typography
          variant="caption"
          color="textSecondary"
          style={ch.centerPct}
        >
          {hovered.percentage.toFixed(1)}%
        </Typography>
      )}
    </View>
  );

  return (
    <View style={ch.container}>
      <DonutChart
        config={{
          data,
          colors: chartColors,
          strokeWidth: 30,
          animationDuration: 700,
          gap: 3,
          roundedCorners: true,
          hover: {
            enabled: true,
            animateOnHover: true,
            updateCenterOnHover: true,
            hitSlop: 6,
          },
          centerValues: {
            enabled: true,
            renderContent: renderCenter,
          },
        }}
      />
    </View>
  );
};

const ch = StyleSheet.create({
  container: {
    height: 230,
    marginBottom: 4,
  } as ViewStyle,
  center: {
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 2,
  } as ViewStyle,
  centerAmount: {
    textAlign: "center",
  } as TextStyle,
  centerLabel: {
    textAlign: "center",
  } as TextStyle,
  centerPct: {
    textAlign: "center",
    marginTop: 1,
  } as TextStyle,
});

// ─── Category row ──────────────────────────────────────────────────────────────

const CategoryRow = ({
  item,
  index,
  currency,
  isFirst,
  isLast,
}: {
  item: CategoryStat;
  index: number;
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
  const bg = item.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];

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

// ─── Tag row ───────────────────────────────────────────────────────────────────

const TagRow = ({
  item,
  index,
  currency,
  isFirst,
  isLast,
}: {
  item: TagStat;
  index: number;
  currency: string;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const { t } = useTranslation();
  const bg = item.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];

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

// ─── Screen ────────────────────────────────────────────────────────────────────

const StatsBreakdownScreen = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const workspaceId = useWorkspaceStore((s) => s.id);

  const params = useLocalSearchParams<{
    accountIds?: string;
    initialType?: string;
    initialTab?: string;
    datePreset?: string;
  }>();

  const accountIds = useMemo(
    () => (params.accountIds ? params.accountIds.split(",") : []),
    [params.accountIds],
  );

  const [activeType, setActiveType] = useState<"expense" | "income">(
    (params.initialType as "expense" | "income") ?? "expense",
  );
  const [activeTab, setActiveTab] = useState<"categories" | "tags">(
    (params.initialTab as "categories" | "tags") ?? "categories",
  );
  const [datePreset, setDatePreset] = useState<DatePreset>(
    (params.datePreset as DatePreset) ?? "thisMonth",
  );

  const dateSheetRef = useRef<BottomSheetModal>(null);

  const { from: fromDate, to: toDate } = getDateRange(datePreset);

  const { data: stats, isLoading } = useTransactionStats(
    workspaceId,
    fromDate,
    toDate,
    accountIds.length > 0 ? accountIds : undefined,
  );

  const currency = stats?.currency ?? "UAH";

  const activeStat = useMemo(
    () => (activeType === "expense" ? stats?.expenses : stats?.income),
    [activeType, stats],
  );
  const categories = activeStat?.byCategory ?? [];
  const tags = activeStat?.byTag ?? [];
  const chartItems = activeTab === "categories" ? categories : tags;

  const typeSegments: Segment<"expense" | "income">[] = [
    { key: "expense", label: t("analytics.expenses") },
    { key: "income", label: t("analytics.income") },
  ];

  const dateLabel = useMemo(() => {
    const locale = i18n.language;
    if (!fromDate && !toDate) return t("analytics.datePresets.allTime");
    const fmt = (s: string) =>
      DateTime.fromISO(s)
        .setLocale(locale)
        .toLocaleString({ day: "numeric", month: "long", year: "numeric" });
    if (!fromDate) return `— ${fmt(toDate!)}`;
    if (!toDate) return `${fmt(fromDate)} —`;
    return `${fmt(fromDate)} – ${fmt(toDate)}`;
  }, [fromDate, toDate, i18n.language, t]);

  const handleTypeChange = useCallback((key: "expense" | "income") => {
    setActiveType(key);
  }, []);

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

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t("analytics.breakdown")}
        left={
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        }
        onLeftPress={() => router.back()}
      />

      {/* Date bar */}
      <Pressable
        style={({ pressed }) => [s.dateBar, pressed && s.pressed]}
        onPress={() => dateSheetRef.current?.present()}
      >
        <Typography variant="caption" color="textSecondary">
          {dateLabel}
        </Typography>
        <Ionicons
          name="calendar-outline"
          size={15}
          color={colors.textSecondary}
        />
      </Pressable>

      {/* Expense / Income toggle */}
      <SegmentedControl
        segments={typeSegments}
        activeKey={activeType}
        onPress={handleTypeChange}
        style={s.segmented}
      />

      {/* Categories / Tags tab bar */}
      <View style={s.tabBarWrapper}>
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

      {/* Donut chart — lives OUTSIDE ScrollView so gesture handler isn't blocked */}
      {!isLoading && chartItems.length > 0 && (
        <StatsDonutChart
          items={chartItems}
          currency={currency}
          isCategory={activeTab === "categories"}
          t={t}
        />
      )}
      {isLoading && <View style={s.chartPlaceholder} />}

      {/* Rows list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {isLoading ? (
          <CategoryRowsSkeleton count={5} />
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
                index={i}
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
              index={i}
              currency={currency}
              isFirst={i === 0}
              isLast={i === tags.length - 1}
            />
          ))
        )}
      </ScrollView>

      {/* Date preset sheet */}
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
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 10,
  } as ViewStyle,
  segmented: {
    marginHorizontal: 16,
    marginBottom: 12,
  } as ViewStyle,
  tabBarWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  chartPlaceholder: {
    height: 230,
    marginBottom: 4,
  } as ViewStyle,
  listContent: {
    paddingHorizontal: 16,
  } as ViewStyle,
  empty: {
    padding: 24,
    alignItems: "center",
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
  } as ViewStyle,
  sheetBg: {
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  sheetHandle: {
    backgroundColor: colors.textTertiary,
  } as ViewStyle,
  pressed: { opacity: 0.6 } as ViewStyle,
});

export default StatsBreakdownScreen;
