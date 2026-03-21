import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { LineChart } from "expo-skia-charts";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@constants/colors";
import { getIconColor } from "@constants/icon-list";
import {
  getAccountTypeConfig,
  getCurrencySymbol,
} from "@constants/account-types";
import { currencyFlag, getCurrencyByCode } from "@constants/currencies";
import { Typography } from "@components/ui/Typography";
import { FabAddButton } from "@components/ui/FabAddButton";
import {
  useAccount,
  useAccountBalanceHistory,
  useAccountTransactions,
  useAccountTotalsConverted,
} from "@services/accounts/accounts.queries";
import { TransactionList } from "@components/transactions/TransactionList";
import { useSinglePressGuard } from "@hooks/useSinglePressGuard";
import { usePickerStore } from "@stores/usePickerStore";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";

const haptic = () => {
  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
};

const NAV_HEIGHT = 56;
// Icon is positioned with marginTop = 20; it starts scrolling behind the nav bar
// at scroll ≈ 20 and is fully hidden at scroll ≈ 20 + 84 = 104.
const ICON_FADE_START = 20;
const ICON_FADE_END = 104;

const formatBalance = (balance: string, currency: string): string => {
  const num = parseFloat(balance);
  const symbol = getCurrencySymbol(currency);
  if (isNaN(num)) return `0 ${symbol}`;
  return `${num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ${symbol}`;
};

const AccountDetailsScreen = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { runWithGuard } = useSinglePressGuard();

  // Computed early so animated worklets can capture it in their closures
  const navBarHeight = insets.top + NAV_HEIGHT;

  const activeWorkspaceId = useWorkspaceStore((s) => s.id);
  const { data: account, isLoading } = useAccount(id);
  const { data: transactions = [], isLoading: txLoading } =
    useAccountTransactions(id);
  const { data: totalsData } = useAccountTotalsConverted(activeWorkspaceId);
  const convertedTotal = totalsData?.accounts.find((ct) => ct.accountId === id);

  const txSearch = "";
  const [highlightedTxId, setHighlightedTxId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const store = usePickerStore.getState();
      if (store.newTransactionId !== null) {
        setHighlightedTxId(store.newTransactionId);
        usePickerStore.setState({ newTransactionId: null });
      }
    }, []),
  );

  const openAdd = useCallback(() => {
    runWithGuard(() => {
      haptic();
      router.push(`/(modals)/add-transaction?defaultAccountId=${id}` as never);
    });
  }, [id, runWithGuard]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Soft ambient glow fades away as the user scrolls into the content
  const heroBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, ICON_FADE_END],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // Small icon in nav bar fades in as the big hero icon scrolls behind the header
  const navIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [ICON_FADE_START, ICON_FADE_END],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // BlurView background for the nav bar fades in as content scrolls under it
  const navBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [ICON_FADE_START, ICON_FADE_END],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const cfg = getAccountTypeConfig(account?.type ?? "bank_account");
  const iconName = (account?.icon ?? cfg.icon) as React.ComponentProps<
    typeof Ionicons
  >["name"];
  const iconColor = account?.color ?? cfg.color;

  const filteredTx = useMemo(() => {
    if (!txSearch.trim()) return transactions;
    const q = txSearch.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.description?.toLowerCase().includes(q) ||
        tx.category?.name.toLowerCase().includes(q) ||
        tx.account.name.toLowerCase().includes(q) ||
        tx.destinationAccount?.name.toLowerCase().includes(q),
    );
  }, [transactions, txSearch]);

  const { data: balanceHistory = [] } = useAccountBalanceHistory(id);

  // x = sequential index so D3 uses a clean linear scale (one tick per month)
  const chartData = useMemo(
    () => balanceHistory.map((p, i) => ({ x: i, y: p.balance })),
    [balanceHistory],
  );
  // "YYYY-MM" strings for axis label formatting
  const chartLabels = useMemo(
    () => balanceHistory.map((p) => p.month),
    [balanceHistory],
  );

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

  const balances = account?.balances ?? [];
  const isMultiCurrency = balances.length > 1;
  // For single-currency display, use the first balance; for chart Y-axis label
  const primaryBalance = balances[0];
  const currency = primaryBalance?.currency ?? "USD";
  const symbol = getCurrencySymbol(currency);

  // ── Skeleton ───────────────────────────────────────────────────────────────
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 750 }),
        withTiming(1, { duration: 750 }),
      ),
      -1,
      false,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (isLoading || !account) {
    return (
      <View style={s.root}>
        {/* nav bar */}
        <View
          style={[s.navBar, { height: navBarHeight, paddingTop: insets.top }]}
        >
          <Pressable
            style={({ pressed }) => [s.navBack, pressed && s.pressed]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
          <View style={s.navEdit} />
        </View>

        <Animated.ScrollView
          scrollEnabled={false}
          contentContainerStyle={[
            s.scrollContent,
            { paddingTop: navBarHeight, paddingBottom: insets.bottom + 32 },
          ]}
        >
          {/* hero */}
          <Animated.View style={[s.hero, pulseStyle]}>
            <View style={sk.iconRing} />
            <View style={sk.nameLine} />
            <View style={sk.balanceLine} />
            <View style={sk.chartCard} />
          </Animated.View>

          {/* tx header */}
          <Animated.View style={[s.txHeader, pulseStyle]}>
            <View style={sk.sectionTitle} />
          </Animated.View>

          {/* tx rows */}
          <Animated.View style={[sk.listCard, pulseStyle]}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View key={i}>
                <View style={sk.txRow}>
                  <View style={sk.txIcon} />
                  <View style={sk.txMeta}>
                    <View style={sk.txLine1} />
                    <View style={sk.txLine2} />
                  </View>
                  <View style={sk.txAmount} />
                </View>
                {i < 6 && <View style={sk.divider} />}
              </View>
            ))}
          </Animated.View>
        </Animated.ScrollView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* ── Soft ambient accent glow – fades out as user scrolls ── */}
      <Animated.View
        style={[s.heroBgLayer, { height: navBarHeight + 240 }, heroBgStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[`${iconColor}70`, `${iconColor}30`, `${iconColor}00`]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* ── Fixed nav bar – transparent, BlurView fades in on scroll ── */}
      <View
        style={[s.navBar, { height: navBarHeight, paddingTop: insets.top }]}
      >
        {/* Frosted glass background – fades in as content scrolls under nav bar */}
        <Animated.View
          style={[StyleSheet.absoluteFill, navBlurStyle]}
          pointerEvents="none"
        >
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={80}
            tint="dark"
          />
        </Animated.View>

        {/* Left: back button */}
        <Pressable
          style={({ pressed }) => [s.navBack, pressed && s.pressed]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        {/* Right: search + edit */}
        <View style={s.navRight}>
          <Pressable
            style={({ pressed }) => [s.navIconBtn, pressed && s.pressed]}
            onPress={() => {
              haptic();
              router.push(`/transactions?accountIds=${id}` as never);
            }}
            hitSlop={8}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.navEdit, pressed && s.pressed]}
            onPress={() => {
              haptic();
              router.push(`/(modals)/edit-account?id=${id}` as never);
            }}
            hitSlop={8}
          >
            <Typography variant="label">{t("common.edit")}</Typography>
          </Pressable>
        </View>

        {/* Center: small account icon – absolutely positioned for true centering */}
        <Animated.View
          style={[s.navCenterIcon, navIconStyle]}
          pointerEvents="none"
        >
          <View style={[s.navIconCircle, { backgroundColor: iconColor }]}>
            <Ionicons
              name={iconName}
              size={18}
              color={getIconColor(iconColor)}
            />
          </View>
        </Animated.View>
      </View>

      {/* ── Scrollable content ── */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: navBarHeight, paddingBottom: insets.bottom + 80 },
        ]}
      >
        {/* Hero – scrolls naturally behind the fixed nav bar */}
        <View style={s.hero}>
          {/* Outer ring – semi-transparent accent circle acting as a visible border */}
          <View style={[s.heroIconRing, { borderColor: iconColor }]}>
            <View style={[s.heroIcon, { backgroundColor: iconColor }]}>
              <Ionicons
                name={iconName}
                size={32}
                color={getIconColor(iconColor)}
              />
            </View>
          </View>
          <Typography variant="h2">{account.name}</Typography>
          {isMultiCurrency ? (
            <>
              {convertedTotal?.totalInPrimary != null ? (
                <Typography
                  variant="h1"
                  color="textPrimary"
                  style={s.balanceText}
                >
                  {formatBalance(
                    String(convertedTotal.totalInPrimary),
                    convertedTotal.primaryCurrency,
                  )}
                </Typography>
              ) : null}
              <Typography
                variant="caption"
                color="textSecondary"
                style={s.multiCurrencySubtitle}
              >
                {t("accounts.currentBalance" as never)}, {balances.length}{" "}
                {t("accounts.currencies" as never)}
              </Typography>
              <View style={s.balanceCurrencyCard}>
                {balances.map((b, i) => (
                  <View key={b.currency}>
                    <View style={s.balanceCurrencyRow}>
                      <View style={s.balanceCurrencyLeft}>
                        <Typography variant="body" color="textSecondary">
                          {currencyFlag(b.currency)}
                        </Typography>
                        <Typography variant="body" color="textSecondary">
                          {getCurrencyByCode(b.currency)?.name ?? b.currency}
                        </Typography>
                      </View>
                      <Typography variant="label" color="textPrimary">
                        {formatBalance(b.balance, b.currency)}
                      </Typography>
                    </View>
                    {i < balances.length - 1 && (
                      <View style={s.balanceCurrencyDivider} />
                    )}
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Typography variant="h1" color="textPrimary" style={s.balanceText}>
              {formatBalance(primaryBalance?.balance ?? "0", currency)}
            </Typography>
          )}

          {/* Balance chart */}
          {chartSeries && (
            <View style={s.chartCard}>
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
                        if (Math.abs(v) >= 1000)
                          return `${(v / 1000).toFixed(0)}K ${symbol}`;
                        return `${v.toFixed(0)} ${symbol}`;
                      },
                    },
                    smoothing: 0.15,
                    animationDuration: 800,
                  }}
                />
              </View>
            </View>
          )}
        </View>

        {/* Transaction history header */}
        <View style={s.txHeader}>
          <Typography variant="label">
            {t("accounts.transactionHistory")}
          </Typography>
          <Pressable
            style={({ pressed }) => [s.txHeaderBtn, pressed && s.pressed]}
            onPress={() => {
              haptic();
              router.push(`/transactions?accountIds=${id}` as never);
            }}
          >
            <Typography variant="caption" style={s.txHeaderBtnLabel}>
              {t("transactions.seeAll")}
            </Typography>
            <Ionicons name="chevron-forward" size={12} color={colors.accent} />
          </Pressable>
        </View>

        {/* Grouped transactions */}
        <View style={s.txList}>
          <TransactionList
            transactions={filteredTx}
            accountId={id ?? ""}
            isLoading={txLoading}
            highlightedTxId={highlightedTxId}
          />
        </View>
      </Animated.ScrollView>

      {/* FAB – add transaction pre-selected to this account */}
      <FabAddButton onPress={openAdd} bottom={insets.bottom + 20} />
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,

  heroBgLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  } as ViewStyle,

  // Nav bar: transparent – BlurView inside handles the background when scrolled
  navBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    overflow: "hidden",
  } as ViewStyle,
  navBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  navIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  navEdit: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  // Absolute overlay spanning full width → truly centers the icon regardless of side-button widths
  navCenterIcon: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  navIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  pressed: { opacity: 0.6 } as ViewStyle,

  scrollContent: {
    paddingHorizontal: 16,
  } as ViewStyle,

  hero: {
    alignItems: "center",
    paddingBottom: 24,
    gap: 6,
  } as ViewStyle,
  heroIconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 4,
  } as ViewStyle,
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  balanceText: {
    marginTop: 2,
    marginBottom: 8,
  } as TextStyle,
  multiCurrencySubtitle: {
    marginTop: 4,
    marginBottom: 12,
  } as TextStyle,
  balanceCurrencyCard: {
    width: "100%",
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
    marginBottom: 16,
  } as ViewStyle,
  balanceCurrencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  } as ViewStyle,
  balanceCurrencyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  balanceCurrencyDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 16,
  } as ViewStyle,

  chartCard: {
    width: "100%",
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 4,
  } as ViewStyle,
  chartArea: {
    height: 180,
    width: "100%",
  } as ViewStyle,

  txHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  } as ViewStyle,
  txHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.accent + "18",
  } as ViewStyle,
  txHeaderBtnLabel: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "600",
  } as TextStyle,

  txList: {
    gap: 12,
  } as ViewStyle,
});

const SKEL = colors.backgroundSurface;

const sk = StyleSheet.create({
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: SKEL,
    marginTop: 20,
    marginBottom: 4,
  } as ViewStyle,
  nameLine: {
    width: 120,
    height: 16,
    borderRadius: 8,
    backgroundColor: SKEL,
  } as ViewStyle,
  balanceLine: {
    width: 180,
    height: 36,
    borderRadius: 10,
    backgroundColor: SKEL,
    marginTop: 4,
    marginBottom: 8,
  } as ViewStyle,
  chartCard: {
    width: "100%",
    height: 196,
    borderRadius: 16,
    backgroundColor: SKEL,
  } as ViewStyle,
  sectionTitle: {
    width: 140,
    height: 14,
    borderRadius: 7,
    backgroundColor: SKEL,
  } as ViewStyle,
  listCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  } as ViewStyle,
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: SKEL,
  } as ViewStyle,
  txMeta: { flex: 1, gap: 6 } as ViewStyle,
  txLine1: {
    height: 13,
    width: "55%",
    borderRadius: 6,
    backgroundColor: SKEL,
  } as ViewStyle,
  txLine2: {
    height: 11,
    width: "35%",
    borderRadius: 5,
    backgroundColor: SKEL,
  } as ViewStyle,
  txAmount: {
    width: 64,
    height: 13,
    borderRadius: 6,
    backgroundColor: SKEL,
  } as ViewStyle,
  divider: {
    height: 0.5,
    backgroundColor: colors.borderStrong,
    marginLeft: 66,
  } as ViewStyle,
});

export default AccountDetailsScreen;
