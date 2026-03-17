import { StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { getCurrencySymbol } from "@constants/account-types";
import { getCategoryDisplayName } from "@constants/default-categories";
import { Typography } from "@components/ui/Typography";
import { bnParse } from "@utils/bn";
import type { AccountTransaction } from "@services/accounts/accounts.api";

type AmountResult = { text: string; color: string };

export const formatTxAmount = (
  tx: AccountTransaction,
  accountId: string,
): AmountResult => {
  const isIncomingTransfer =
    tx.destinationAccount?.id === accountId && tx.type === "transfer";
  const raw = bnParse(
    isIncomingTransfer && tx.destinationAmount
      ? tx.destinationAmount
      : tx.amount,
  );
  const currency = isIncomingTransfer
    ? (tx.destinationAccount?.currency ?? tx.account.currency)
    : tx.account.currency;
  const symbol = getCurrencySymbol(currency);
  const abs = raw.abs().toFormat(2);

  if (tx.type === "income" || isIncomingTransfer) {
    return { text: `+${abs} ${symbol}`, color: colors.success };
  }
  return { text: `${abs} ${symbol}`, color: colors.textPrimary };
};

const SPECIAL_ICON: Record<
  string,
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  initial_balance: "flag-outline",
  balance_correction: "scale-outline",
};

type Props = {
  tx: AccountTransaction;
  accountId: string;
  isLast: boolean;
};

export const TransactionItem = ({ tx, accountId, isLast }: Props) => {
  const { t } = useTranslation();
  const { text, color } = formatTxAmount(tx, accountId);
  const isTransfer = tx.type === "transfer";
  const isInitialBalance = tx.type === "initial_balance";
  const isBalanceCorrection = tx.type === "balance_correction";
  const isSpecial = isInitialBalance || isBalanceCorrection;

  const isUncategorized = !isSpecial && !isTransfer && !tx.category;

  const iconName = (
    isSpecial
      ? SPECIAL_ICON[tx.type]
      : isTransfer
        ? "swap-horizontal"
        : isUncategorized
          ? "help"
          : (tx.category?.icon ?? "receipt-outline")
  ) as React.ComponentProps<typeof Ionicons>["name"];

  // Subtitle always shows account name (for transfers: source → destination)
  const subtitle = isTransfer
    ? tx.destinationAccount
      ? `${tx.account.name} → ${tx.destinationAccount.name}`
      : tx.account.name
    : tx.account.name;

  const categoryLabel = tx.category
    ? getCategoryDisplayName(tx.category, t)
    : null;

  const title = isInitialBalance
    ? t("addTransaction.initialBalance")
    : isBalanceCorrection
      ? t("addTransaction.balanceCorrection")
      : (tx.description ??
        (isTransfer
          ? t("addTransaction.transfer")
          : (categoryLabel ??
            (isUncategorized
              ? t("addTransaction.uncategorized")
              : t("addTransaction.transaction")))));

  return (
    <View>
      <View style={s.row}>
        <View style={s.iconWrap}>
          <Ionicons name={iconName} size={18} color={colors.textPrimary} />
          {isUncategorized && <View style={s.uncatDot} />}
        </View>
        <View style={s.info}>
          <Typography variant="body" color="textPrimary">
            {title}
          </Typography>
          <View style={s.subtitleRow}>
            <Ionicons
              name="wallet-outline"
              size={13}
              color={colors.textTertiary}
            />
            <Typography variant="caption" color="textTertiary">
              {subtitle}
            </Typography>
          </View>
        </View>
        <Typography variant="body" style={{ color }}>
          {text}
        </Typography>
      </View>
      {!isLast && <View style={s.divider} />}
    </View>
  );
};

const s = StyleSheet.create({
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
    borderRadius: 10,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  uncatDot: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.iconBlue,
  } as ViewStyle,
  info: { flex: 1, gap: 3 } as ViewStyle,
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  } as ViewStyle,
  divider: {
    height: 0.5,
    backgroundColor: colors.borderStrong,
    marginLeft: 66,
  } as ViewStyle,
});
