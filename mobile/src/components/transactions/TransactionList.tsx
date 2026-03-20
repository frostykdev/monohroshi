import { ActivityIndicator, StyleSheet, View, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { TransactionItem } from "./TransactionItem";
import type { AccountTransaction } from "@services/accounts/accounts.api";

export const groupByDate = (
  transactions: AccountTransaction[],
): { date: string; items: AccountTransaction[] }[] => {
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

export const formatGroupDate = (dateStr: string, locale: string): string =>
  new Date(dateStr).toLocaleDateString(
    locale.startsWith("uk") ? "uk-UA" : "en-US",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

type Props = {
  transactions: AccountTransaction[];
  accountId: string;
  isLoading: boolean;
  emptyMessage?: string;
};

export const TransactionList = ({
  transactions,
  accountId,
  isLoading,
  emptyMessage,
}: Props) => {
  const { t, i18n } = useTranslation();
  const grouped = groupByDate(transactions);

  if (isLoading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (grouped.length === 0) {
    return (
      <View style={s.empty}>
        <Typography variant="body" color="textTertiary" align="center">
          {emptyMessage ?? t("accounts.noTransactions")}
        </Typography>
      </View>
    );
  }

  return (
    <>
      {grouped.map((group) => (
        <View key={group.date} style={s.dateGroup}>
          <Typography
            variant="caption"
            color="textSecondary"
            style={s.dateLabel}
          >
            {formatGroupDate(group.date, i18n.language)}
          </Typography>
          <View style={s.txCard}>
            {group.items.map((tx, idx) => (
              <TransactionItem
                key={tx.id}
                tx={tx}
                accountId={accountId}
                isLast={idx === group.items.length - 1}
              />
            ))}
          </View>
        </View>
      ))}
    </>
  );
};

const s = StyleSheet.create({
  loader: { paddingVertical: 40, alignItems: "center" } as ViewStyle,
  empty: { paddingVertical: 40, alignItems: "center" } as ViewStyle,
  dateGroup: { gap: 6 } as ViewStyle,
  dateLabel: { paddingHorizontal: 4 } as ViewStyle,
  txCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
});
