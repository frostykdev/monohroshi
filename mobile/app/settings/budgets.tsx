import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { getCurrencySymbol } from "@constants/account-types";
import { Typography } from "@components/ui/Typography";
import { ScreenHeader } from "@components/ui/ScreenHeader";
import { useWorkspaceStore } from "@stores/useWorkspaceStore";
import { useBudgets, useDeleteBudget } from "@services/budgets/budgets.queries";
import type { Budget } from "@services/budgets/budgets.api";

const haptic = () => {
  if (process.env.EXPO_OS === "ios") Haptics.selectionAsync();
};

const getCurrentMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const formatAmount = (value: number, symbol: string) => {
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
};

type BudgetRowProps = {
  budget: Budget;
  currency: string;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
};

const BudgetRow = ({ budget, currency, onEdit, onDelete }: BudgetRowProps) => {
  const { t } = useTranslation();
  const symbol = getCurrencySymbol(currency);
  const amount = parseFloat(budget.amount);
  const spent = budget.spent;
  const progress = amount > 0 ? Math.min(spent / amount, 1) : 0;
  const isOverBudget = spent > amount;

  const iconName = (budget.category?.icon ??
    (budget.category ? "pricetag" : "globe-outline")) as React.ComponentProps<
    typeof Ionicons
  >["name"];
  const iconBg = budget.category?.color ?? colors.backgroundSurface;
  const iconColor = budget.category?.color ? "#fff" : colors.textPrimary;

  return (
    <Pressable
      style={({ pressed }) => [s.row, pressed && s.pressed]}
      onPress={() => {
        haptic();
        onEdit(budget);
      }}
    >
      <View style={s.rowHeader}>
        <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <View style={s.rowInfo}>
          <Typography variant="label">
            {budget.category ? budget.category.name : t("budgets.general")}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {t("budgets.of")} {formatAmount(amount, symbol)}
          </Typography>
        </View>
        <View style={s.rowAmounts}>
          <Typography
            variant="label"
            color={isOverBudget ? "error" : "textPrimary"}
          >
            {formatAmount(spent, symbol)}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {t("budgets.remaining")}: {formatAmount(budget.remaining, symbol)}
          </Typography>
        </View>
      </View>

      <View style={s.progressBg}>
        <View
          style={[
            s.progressFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: isOverBudget ? colors.error : colors.accent,
            },
          ]}
        />
      </View>
    </Pressable>
  );
};

const BudgetsScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeWorkspaceId = useWorkspaceStore((s) => s.id);
  const month = getCurrentMonth();

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const workspaceCurrency =
    workspaces.find((w) => w.id === activeWorkspaceId)?.currency ?? "USD";

  const { data: budgets = [], isLoading } = useBudgets(
    activeWorkspaceId,
    month,
  );
  const { mutate: deleteBudget } = useDeleteBudget(activeWorkspaceId, month);

  const handleEdit = (budget: Budget) => {
    router.push(
      `/(modals)/add-budget?id=${budget.id}&amount=${encodeURIComponent(budget.amount)}&categoryId=${budget.categoryId ?? ""}&categoryName=${encodeURIComponent(budget.category?.name ?? "")}` as never,
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t("budgets.deleteConfirmTitle"),
      t("budgets.deleteConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("budgets.deleteConfirmButton"),
          style: "destructive",
          onPress: () => deleteBudget(id),
        },
      ],
    );
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScreenHeader
        title={t("budgets.title")}
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
          router.push("/(modals)/add-budget" as never);
        }}
      />

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : budgets.length === 0 ? (
        <View style={s.center}>
          <Ionicons
            name="bar-chart-outline"
            size={48}
            color={colors.textTertiary}
          />
          <Typography
            variant="body"
            color="textTertiary"
            align="center"
            style={s.emptyText}
          >
            {t("budgets.empty")}
          </Typography>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {(() => {
            const general = budgets.filter((b) => b.categoryId === null);
            const categories = budgets.filter((b) => b.categoryId !== null);
            return (
              <>
                {general.length > 0 && (
                  <>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      style={s.sectionLabel}
                    >
                      {t("budgets.general").toUpperCase()}
                    </Typography>
                    <View style={s.card}>
                      {general.map((budget, index) => (
                        <View key={budget.id}>
                          <BudgetRow
                            budget={budget}
                            currency={workspaceCurrency}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                          {index < general.length - 1 && (
                            <View style={s.divider} />
                          )}
                        </View>
                      ))}
                    </View>
                  </>
                )}
                {categories.length > 0 && (
                  <>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      style={s.sectionLabel}
                    >
                      {t("budgets.category").toUpperCase()}
                    </Typography>
                    <View style={s.card}>
                      {categories.map((budget, index) => (
                        <View key={budget.id}>
                          <BudgetRow
                            budget={budget}
                            currency={workspaceCurrency}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                          {index < categories.length - 1 && (
                            <View style={s.divider} />
                          )}
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            );
          })()}
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  } as ViewStyle,
  emptyText: {
    textAlign: "center",
  } as TextStyle,
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  } as ViewStyle,
  sectionLabel: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  } as TextStyle,
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
  } as ViewStyle,
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  } as ViewStyle,
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  } as ViewStyle,
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSurface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  rowInfo: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  rowAmounts: {
    alignItems: "flex-end",
    gap: 2,
  } as ViewStyle,
  progressBg: {
    height: 4,
    backgroundColor: colors.backgroundSurface,
    borderRadius: 2,
    overflow: "hidden",
  } as ViewStyle,
  progressFill: {
    height: 4,
    borderRadius: 2,
  } as ViewStyle,
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 64,
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
});

export default BudgetsScreen;
