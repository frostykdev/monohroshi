import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { getIconColor } from "@constants/icon-list";
import {
  getAccountTypeConfig,
  getCurrencySymbol,
  ACCOUNT_TYPES,
} from "@constants/account-types";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import {
  useAccounts,
  useAccountTotalsConverted,
} from "@services/accounts/accounts.queries";
import type {
  Account,
  ConvertedAccountTotal,
} from "@services/accounts/accounts.api";

const haptic = () => {
  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
};

const formatBalance = (balance: string, currency: string) => {
  const num = parseFloat(balance);
  if (isNaN(num)) return `0 ${getCurrencySymbol(currency)}`;
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${formatted} ${getCurrencySymbol(currency)}`;
};

type AccountRowProps = { account: Account };

const AccountRow = ({ account }: AccountRowProps) => {
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
        {account.isPrimary && (
          <Typography variant="caption" color="textTertiary">
            Primary
          </Typography>
        )}
      </View>
      <Typography variant="body" color="textPrimary" style={s.accountBalance}>
        {formatBalance(account.balance, account.currency)}
      </Typography>
    </Pressable>
  );
};

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
      const sectionIds = new Set(accounts.map((a) => a.id));
      const relevant = convertedTotals.filter((ct) =>
        sectionIds.has(ct.accountId),
      );
      if (relevant.length === 0) return null;
      // Only show total when every account was successfully converted
      if (!relevant.every((ct) => ct.converted)) return null;
      return relevant.reduce((sum, ct) => sum + (ct.balanceInPrimary ?? 0), 0);
    }
    const allSameCurrency = accounts.every(
      (a) => a.currency === accounts[0]?.currency,
    );
    if (allSameCurrency) {
      return accounts.reduce((sum, a) => sum + parseFloat(a.balance || "0"), 0);
    }
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

const AccountsScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeWorkspaceId = useWorkspaceStore((s) => s.id);

  const { data: accounts = [], isLoading } = useAccounts(activeWorkspaceId);
  const { data: totalsData } = useAccountTotalsConverted(activeWorkspaceId);
  const convertedTotals = totalsData?.accounts ?? [];

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

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScreenHeader
        title={t("accounts.title")}
        left={
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        }
        onLeftPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(tabs)/settings" as never);
          }
        }}
        right={<Ionicons name="add" size={26} color={colors.textPrimary} />}
        onRightPress={() => {
          haptic();
          router.push("/(modals)/add-account" as never);
        }}
      />

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : accounts.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons
            name="wallet-outline"
            size={48}
            color={colors.textTertiary}
          />
          <Typography variant="body" color="textTertiary" align="center">
            {t("accounts.empty")}
          </Typography>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {grouped.map(({ type, accounts: typeAccounts }) => (
            <AccountSection
              key={type}
              typeKey={type}
              accounts={typeAccounts}
              convertedTotals={convertedTotals}
              isExpanded={!collapsed[type]}
              onToggle={() => toggleSection(type)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as ViewStyle,
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
    paddingTop: 8,
  } as ViewStyle,
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
  sectionTitle: { flex: 1 },
  sectionTotal: { textAlign: "right" },
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
  accountBalance: { textAlign: "right" },
  pressed: { opacity: 0.6 } as ViewStyle,
});

export default AccountsScreen;
