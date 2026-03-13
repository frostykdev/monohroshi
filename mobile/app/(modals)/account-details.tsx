import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import {
  getAccountTypeConfig,
  getCurrencySymbol,
} from "@constants/account-types";
import { Typography } from "@components/ui/Typography";
import {
  useAccount,
  useAccountTransactions,
  useDeleteAccount,
} from "@services/accounts/accounts.queries";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import type { AccountTransaction } from "@services/accounts/accounts.api";

const haptic = () => {
  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
};

const formatBalance = (balance: string, currency: string): string => {
  const num = parseFloat(balance);
  const symbol = getCurrencySymbol(currency);
  if (isNaN(num)) return `0 ${symbol}`;
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${symbol}`;
};

type AmountResult = { text: string; color: string };

const formatTxAmount = (
  tx: AccountTransaction,
  accountId: string,
): AmountResult => {
  const isDestination =
    tx.destinationAccount?.id === accountId && tx.type === "transfer";
  const raw =
    isDestination && tx.destinationAmount
      ? parseFloat(tx.destinationAmount)
      : parseFloat(tx.amount);
  const currency = isDestination
    ? (tx.destinationAccount?.currency ?? tx.account.currency)
    : tx.account.currency;
  const symbol = getCurrencySymbol(currency);
  const abs = Math.abs(raw).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (tx.type === "income" || isDestination) {
    return { text: `+${abs} ${symbol}`, color: colors.success };
  }
  if (tx.type === "expense") {
    return { text: `-${abs} ${symbol}`, color: colors.error };
  }
  return { text: `${abs} ${symbol}`, color: colors.textPrimary };
};

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const groupByDate = (transactions: AccountTransaction[]) => {
  const groups: { date: string; items: AccountTransaction[] }[] = [];
  for (const tx of transactions) {
    const key = tx.date.slice(0, 10);
    const existing = groups.find((g) => g.date === key);
    if (existing) {
      existing.items.push(tx);
    } else {
      groups.push({ date: key, items: [tx] });
    }
  }
  return groups;
};

type TxRowProps = { tx: AccountTransaction; accountId: string };

const TxRow = ({ tx, accountId }: TxRowProps) => {
  const { text, color } = formatTxAmount(tx, accountId);
  const isTransfer = tx.type === "transfer";

  const iconName = (
    isTransfer ? "swap-horizontal" : (tx.category?.icon ?? "receipt-outline")
  ) as React.ComponentProps<typeof Ionicons>["name"];

  const subtitle = isTransfer
    ? tx.destinationAccount
      ? `${tx.account.name} → ${tx.destinationAccount.name}`
      : tx.account.name
    : (tx.category?.name ?? tx.account.name);

  const title =
    tx.description ??
    (isTransfer ? "Transfer" : (tx.category?.name ?? "Transaction"));

  return (
    <View style={ts.row}>
      <View style={ts.iconWrap}>
        <Ionicons name={iconName} size={18} color={colors.textPrimary} />
      </View>
      <View style={ts.info}>
        <Typography variant="body" color="textPrimary">
          {title}
        </Typography>
        <Typography variant="caption" color="textTertiary">
          {subtitle}
        </Typography>
      </View>
      <Typography variant="body" style={{ color }}>
        {text}
      </Typography>
    </View>
  );
};

const ts = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  } as ViewStyle,
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  info: { flex: 1, gap: 2 } as ViewStyle,
});

const AccountDetailsScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const activeWorkspaceId = useWorkspaceStore((s) => s.id);
  const { data: account, isLoading } = useAccount(id);
  const { data: transactions = [], isLoading: txLoading } =
    useAccountTransactions(id);
  const { mutate: removeAccount, isPending: deleting } =
    useDeleteAccount(activeWorkspaceId);

  const [txSearch, setTxSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

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

  const grouped = groupByDate(filteredTx);

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      t("accounts.deleteConfirmTitle"),
      t("accounts.deleteConfirmMessage", { name: account?.name ?? "" }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () =>
            removeAccount(id, {
              onSuccess: () => router.back(),
              onError: () =>
                Alert.alert(
                  t("accounts.errors.deleteTitle"),
                  t("accounts.errors.deleteMessage"),
                ),
            }),
        },
      ],
    );
  };

  if (isLoading || !account) {
    return (
      <View style={[s.container, s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const isNegative = parseFloat(account.balance) < 0;

  return (
    <View style={[s.container, { paddingBottom: insets.bottom }]}>
      {/* Coloured header */}
      <View style={[s.headerArea, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerButtons}>
          <Pressable
            style={({ pressed }) => [s.circleButton, pressed && s.pressed]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.pillButton, pressed && s.pressed]}
            onPress={() => {
              haptic();
              router.push(`/(modals)/edit-account?id=${id}` as never);
            }}
            hitSlop={8}
          >
            <Typography variant="label">{t("common.edit" as never)}</Typography>
          </Pressable>
        </View>

        <View style={s.accountHero}>
          <View style={[s.heroIcon, { backgroundColor: iconColor }]}>
            <Ionicons name={iconName} size={32} color="#fff" />
          </View>
          <Typography variant="h2">{account.name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {t("accounts.currentBalance")}
          </Typography>
          <Typography
            variant="h1"
            color={isNegative ? "error" : "textPrimary"}
            style={s.balanceText}
          >
            {formatBalance(account.balance, account.currency)}
          </Typography>
        </View>
      </View>

      {/* Transaction history label + search toggle */}
      <View style={s.historySection}>
        <View style={s.historyHeader}>
          <Typography variant="label">
            {t("accounts.transactionHistory")}
          </Typography>
          <Pressable
            style={({ pressed }) => [s.searchIconBtn, pressed && s.pressed]}
            onPress={() => {
              haptic();
              setShowSearch((v) => !v);
              if (showSearch) setTxSearch("");
            }}
          >
            <Ionicons
              name={showSearch ? "close" : "search"}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        {showSearch && (
          <View style={s.searchRow}>
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput
              style={s.searchInput}
              value={txSearch}
              onChangeText={setTxSearch}
              placeholder={t("accounts.searchTransactions")}
              placeholderTextColor={colors.textTertiary}
              autoFocus
              returnKeyType="search"
            />
          </View>
        )}
      </View>

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {txLoading ? (
          <View style={s.txLoader}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : grouped.length === 0 ? (
          <View style={s.emptyTx}>
            <Typography variant="body" color="textTertiary" align="center">
              {t("accounts.noTransactions")}
            </Typography>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.date} style={s.dateGroup}>
              <View style={s.dateHeader}>
                <Typography variant="caption" color="textSecondary">
                  {formatDate(group.date)}
                </Typography>
              </View>
              <View style={s.txCard}>
                {group.items.map((tx, idx) => (
                  <View key={tx.id}>
                    {idx > 0 && <View style={s.txDivider} />}
                    <TxRow tx={tx} accountId={id!} />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        <Pressable
          style={({ pressed }) => [
            s.deleteButton,
            pressed && s.pressed,
            deleting && s.pressed,
          ]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Typography variant="body" color="error">
            {t("accounts.deleteAccount")}
          </Typography>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as ViewStyle,
  flex: { flex: 1 } as ViewStyle,
  centered: { alignItems: "center", justifyContent: "center" } as ViewStyle,
  headerArea: {
    backgroundColor: colors.backgroundElevated,
    paddingBottom: 24,
  } as ViewStyle,
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  } as ViewStyle,
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  pillButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  pressed: { opacity: 0.6 } as ViewStyle,
  accountHero: {
    alignItems: "center",
    paddingTop: 8,
    gap: 6,
  } as ViewStyle,
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  } as ViewStyle,
  balanceText: { marginTop: 2 } as TextStyle,
  historySection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  } as ViewStyle,
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  } as ViewStyle,
  searchIconBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    gap: 8,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  } as TextStyle,
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  } as ViewStyle,
  txLoader: { paddingVertical: 40, alignItems: "center" } as ViewStyle,
  emptyTx: { paddingVertical: 40, alignItems: "center" } as ViewStyle,
  dateGroup: { gap: 6 } as ViewStyle,
  dateHeader: { paddingHorizontal: 4 } as ViewStyle,
  txCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
  txDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 66,
  } as ViewStyle,
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  } as ViewStyle,
});

export default AccountDetailsScreen;
