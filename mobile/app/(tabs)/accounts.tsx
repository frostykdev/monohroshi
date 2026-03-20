import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
  DimensionValue,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { LineChart } from "expo-skia-charts";
import { colors } from "@constants/colors";
import { getIconColor } from "@constants/icon-list";
import {
  getAccountTypeConfig,
  getCurrencySymbol,
  ACCOUNT_TYPES,
} from "@constants/account-types";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import {
  useAccounts,
  useAccountTotalsConverted,
  useWorkspaceBalanceHistory,
} from "@services/accounts/accounts.queries";
import type {
  Account,
  ConvertedAccountTotal,
} from "@services/accounts/accounts.api";

const haptic = () => {
  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
};

const formatBalance = (balance: string | number, currency: string) => {
  const num = typeof balance === "string" ? parseFloat(balance) : balance;
  if (isNaN(num)) return `0 ${getCurrencySymbol(currency)}`;
  return (
    num.toLocaleString("uk-UA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) +
    " " +
    getCurrencySymbol(currency)
  );
};

// ─── Account row ──────────────────────────────────────────────────────────────

const AccountRow = ({ account }: { account: Account }) => {
  const cfg = getAccountTypeConfig(account.type);
  const iconName = (account.icon ?? cfg.icon) as React.ComponentProps<
    typeof Ionicons
  >["name"];
  const iconColor = account.color ?? cfg.color;
  return (
    <Pressable
      style={({ pressed }) => [s.accountRow, pressed && s.pressed]}
      onPress={() => {
        haptic();
        router.push(`/settings/account-details?id=${account.id}` as never);
      }}
    >
      <View style={[s.accountIcon, { backgroundColor: iconColor }]}>
        <Ionicons name={iconName} size={20} color={getIconColor(iconColor)} />
      </View>
      <View style={s.accountInfo}>
        <Typography variant="body" color="textPrimary">
          {account.name}
        </Typography>
      </View>
      <Typography variant="body" color="textPrimary" style={s.accountBalance}>
        {formatBalance(account.balance, account.currency)}
      </Typography>
    </Pressable>
  );
};

// ─── Account section ──────────────────────────────────────────────────────────

type SectionProps = {
  typeKey: string;
  accounts: Account[];
  convertedTotals: ConvertedAccountTotal[];
  isExpanded: boolean;
  onToggle: () => void;
};

const AccountSection = ({
  typeKey,
  accounts,
  convertedTotals,
  isExpanded,
  onToggle,
}: SectionProps) => {
  const { t } = useTranslation();
  const primaryCurrency = convertedTotals[0]?.primaryCurrency;

  const total = (() => {
    if (convertedTotals.length > 0 && primaryCurrency) {
      const ids = new Set(accounts.map((a) => a.id));
      const relevant = convertedTotals.filter((ct) => ids.has(ct.accountId));
      if (relevant.length === 0) return null;
      if (!relevant.every((ct) => ct.converted)) return null;
      return relevant.reduce((sum, ct) => sum + (ct.balanceInPrimary ?? 0), 0);
    }
    const allSame = accounts.every((a) => a.currency === accounts[0]?.currency);
    if (allSame)
      return accounts.reduce((sum, a) => sum + parseFloat(a.balance || "0"), 0);
    return null;
  })();

  const currency =
    convertedTotals.length > 0 && primaryCurrency
      ? primaryCurrency
      : (accounts[0]?.currency ?? "");

  return (
    <View style={s.section}>
      <Pressable
        style={({ pressed }) => [s.sectionHeader, pressed && s.pressed]}
        onPress={() => {
          haptic();
          onToggle();
        }}
      >
        <Ionicons
          name={isExpanded ? "chevron-down" : "chevron-forward"}
          size={16}
          color={colors.textTertiary}
        />
        <Typography variant="label" style={s.sectionTitle}>
          {t(`onboarding.accountSetup.types.${typeKey}` as never)}
        </Typography>
        {total !== null && (
          <Typography
            variant="body"
            color="textSecondary"
            style={s.sectionTotal}
          >
            {formatBalance(String(total), currency)}
          </Typography>
        )}
      </Pressable>

      {isExpanded && (
        <View style={s.sectionBody}>
          {accounts.map((account, idx) => (
            <View key={account.id}>
              {idx > 0 && <View style={s.rowDivider} />}
              <AccountRow account={account} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Empty chart placeholder ──────────────────────────────────────────────────

const EMPTY_TICK_WIDTHS: DimensionValue[] = ["75%", "55%", "65%"];

const EmptyChart = () => (
  <View style={s.emptyChartArea}>
    <View style={s.emptyChartBody}>
      {EMPTY_TICK_WIDTHS.map((w, i) => (
        <View key={i} style={[s.emptyChartTick, { width: w }]} />
      ))}
      <View style={s.emptyChartLine} />
    </View>
    <View style={s.emptyChartXAxis}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={s.emptyChartXTick} />
      ))}
    </View>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const AccountsScreen = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeWorkspaceId = useWorkspaceStore((s) => s.id);
  const workspaceName = useWorkspaceStore((s) => s.name);
  const initial = workspaceName ? workspaceName.charAt(0).toUpperCase() : "W";

  const {
    data: accounts = [],
    isLoading,
    refetch,
  } = useAccounts(activeWorkspaceId);
  const { data: totalsData, refetch: refetchTotals } =
    useAccountTotalsConverted(activeWorkspaceId);
  const convertedTotals = useMemo(
    () => totalsData?.accounts ?? [],
    [totalsData],
  );
  const primaryCurrency = totalsData?.primaryCurrency ?? "USD";

  const { data: balanceHistory = [] } =
    useWorkspaceBalanceHistory(activeWorkspaceId);

  const allTypes = ACCOUNT_TYPES.map((a) => a.type);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (type: string) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const grouped = allTypes
    .map((type) => ({
      type,
      accounts: accounts.filter((a) => a.type === type),
    }))
    .filter((g) => g.accounts.length > 0);

  // Total current balance (converted) — memoized to avoid recalculating on every render
  const totalBalance = useMemo(() => {
    if (convertedTotals.length === 0) return null;
    const all = convertedTotals.filter((ct) => ct.converted);
    if (all.length !== convertedTotals.length) return null;
    return all.reduce((s, ct) => s + (ct.balanceInPrimary ?? 0), 0);
  }, [convertedTotals]);

  const effectiveBalanceHistory = useMemo(() => {
    if (totalBalance === null) return balanceHistory;

    const currentMonth = DateTime.now().toFormat("yyyy-MM");
    const lastPoint = balanceHistory[balanceHistory.length - 1];

    if (lastPoint?.month === currentMonth) {
      return [
        ...balanceHistory.slice(0, -1),
        { ...lastPoint, balance: totalBalance },
      ];
    }

    return [...balanceHistory, { month: currentMonth, balance: totalBalance }];
  }, [balanceHistory, totalBalance]);

  // Percentage change vs previous month
  const percentChange = (() => {
    if (effectiveBalanceHistory.length < 2) return null;
    const prev =
      effectiveBalanceHistory[effectiveBalanceHistory.length - 2].balance;
    const curr =
      effectiveBalanceHistory[effectiveBalanceHistory.length - 1].balance;
    if (prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  })();

  // Chart data
  const chartData = effectiveBalanceHistory.map((p, i) => ({
    x: i,
    y: p.balance,
  }));
  const chartLabels = effectiveBalanceHistory.map((p) => p.month);
  const locale = i18n.language.startsWith("uk") ? "uk-UA" : "en-US";

  // Series with a transparent ghost that widens the Y domain so small balance
  // changes don't fill the entire chart height.
  const chartSeries = useMemo(() => {
    if (chartData.length === 0) return null;
    const yValues = chartData.map((d) => d.y);
    const maxY = Math.max(...yValues);
    const minY = Math.min(...yValues);
    const paddingAmount = maxY * 0.1;
    const paddedMin = Math.max(0, minY - paddingAmount);
    const paddedMax = maxY + paddingAmount;
    const lastX = chartData[chartData.length - 1]!.x;
    return [
      {
        id: "domain",
        data: [
          { x: -0.001, y: paddedMin },
          { x: lastX + 0.001, y: paddedMax },
        ],
        colors: { highlightColor: "transparent" },
      },
      {
        id: "data",
        data: chartData,
        colors: {
          highlightColor: colors.iconBlue,
          areaFill: {
            type: "gradient" as const,
            startColor: `${colors.iconBlue}40`,
            endColor: `${colors.iconBlue}00`,
          },
        },
      },
    ];
  }, [chartData]);

  const handleRefresh = () => {
    haptic();
    refetch();
    refetchTotals();
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
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

        <View style={s.headerActions}>
          <Pressable
            style={({ pressed }) => [s.headerIcon, pressed && s.pressed]}
            onPress={() => {
              haptic();
              router.push("/(modals)/add-account" as never);
            }}
            hitSlop={6}
          >
            <Ionicons name="add" size={22} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.headerIcon, pressed && s.pressed]}
            onPress={handleRefresh}
            hitSlop={6}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={colors.textPrimary}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.headerIcon, pressed && s.pressed]}
            hitSlop={6}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.textPrimary}
            />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Balance dynamics card ── */}
          <View style={s.chartCard}>
            <View style={s.chartCardHeader}>
              <Typography variant="caption" color="textSecondary">
                {t("accounts.balanceDynamics")}
              </Typography>
            </View>

            {totalBalance !== null && (
              <View style={s.balanceRow}>
                <Typography
                  variant="h1"
                  color="textPrimary"
                  style={s.totalBalance}
                >
                  {formatBalance(totalBalance, primaryCurrency)}
                </Typography>
                {percentChange !== null && (
                  <View
                    style={[
                      s.changeBadge,
                      {
                        backgroundColor:
                          percentChange >= 0
                            ? `${colors.success}25`
                            : `${colors.error}25`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={percentChange >= 0 ? "caret-up" : "caret-down"}
                      size={11}
                      color={percentChange >= 0 ? colors.success : colors.error}
                    />
                    <Typography
                      variant="caption"
                      style={{
                        color:
                          percentChange >= 0 ? colors.success : colors.error,
                        fontWeight: "600",
                      }}
                    >
                      {Math.abs(percentChange).toFixed(1)}%
                    </Typography>
                  </View>
                )}
              </View>
            )}

            {chartSeries ? (
              <View style={s.chartArea}>
                <LineChart
                  config={{
                    series: chartSeries,
                    xAxis: {
                      enabled: true,
                      tickCount: chartData.length,
                      color: colors.textTertiary,
                      fontSize: 11,
                      formatter: (v) => {
                        if (!Number.isInteger(v)) return "";
                        const monthKey = chartLabels[v];
                        if (!monthKey) return "";
                        return DateTime.fromFormat(monthKey, "yyyy-MM")
                          .setLocale(locale)
                          .toFormat("MMM");
                      },
                    },
                    yAxis: {
                      enabled: true,
                      tickCount: 3,
                      color: colors.textTertiary,
                      fontSize: 11,
                      formatter: (v) => {
                        const sym = getCurrencySymbol(primaryCurrency);
                        if (Math.abs(v) >= 1000)
                          return `${(v / 1000).toFixed(0)}K ${sym}`;
                        return `${v.toFixed(0)} ${sym}`;
                      },
                    },
                    smoothing: 0.15,
                    animationDuration: 800,
                  }}
                />
              </View>
            ) : (
              <EmptyChart />
            )}
          </View>

          {/* ── Account sections ── */}
          {accounts.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons
                name="wallet-outline"
                size={48}
                color={colors.textTertiary}
              />
              <Typography variant="body" color="textTertiary" align="center">
                {t("accounts.empty")}
              </Typography>
              <Button
                variant="secondary"
                size="sm"
                i18nKey="accounts.addAccount"
                onPress={() => {
                  haptic();
                  router.push("/(modals)/add-account" as never);
                }}
                style={s.emptyAddButton}
              />
            </View>
          ) : (
            grouped.map(({ type, accounts: typeAccounts }) => (
              <AccountSection
                key={type}
                typeKey={type}
                accounts={typeAccounts}
                convertedTotals={convertedTotals}
                isExpanded={!collapsed[type]}
                onToggle={() => toggleSection(type)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as ViewStyle,

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
  wsLetter: { fontSize: 14, fontWeight: "700" } as TextStyle,
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  // Loader / empty
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    paddingVertical: 40,
  } as ViewStyle,
  emptyAddButton: {
    marginTop: 4,
    alignSelf: "center",
    paddingHorizontal: 24,
  } as ViewStyle,

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  } as ViewStyle,

  // Balance dynamics card
  chartCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 8,
  } as ViewStyle,
  chartCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  } as ViewStyle,
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  } as ViewStyle,
  totalBalance: { fontVariant: ["tabular-nums"] } as TextStyle,
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  } as ViewStyle,
  chartArea: { height: 160, width: "100%" } as ViewStyle,

  // Empty chart placeholder
  emptyChartArea: {
    height: 160,
    width: "100%",
    paddingBottom: 20,
    justifyContent: "flex-end",
  } as ViewStyle,
  emptyChartBody: {
    flex: 1,
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingVertical: 8,
  } as ViewStyle,
  emptyChartTick: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    opacity: 0.5,
  } as ViewStyle,
  emptyChartLine: {
    height: 2,
    width: "100%",
    borderRadius: 1,
    backgroundColor: colors.border,
    opacity: 0.4,
  } as ViewStyle,
  emptyChartXAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  } as ViewStyle,
  emptyChartXTick: {
    height: 8,
    width: 28,
    borderRadius: 4,
    backgroundColor: colors.border,
    opacity: 0.4,
  } as ViewStyle,

  // Account sections
  section: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  } as ViewStyle,
  sectionTitle: { flex: 1 } as TextStyle,
  sectionTotal: { textAlign: "right" } as TextStyle,
  sectionBody: {} as ViewStyle,
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 72,
  } as ViewStyle,
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  } as ViewStyle,
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  accountInfo: { flex: 1, gap: 2 } as ViewStyle,
  accountBalance: { textAlign: "right" } as TextStyle,
  pressed: { opacity: 0.6 } as ViewStyle,
});

export default AccountsScreen;
