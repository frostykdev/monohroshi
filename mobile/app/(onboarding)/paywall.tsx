import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { PurchasesPackage, PACKAGE_TYPE } from "react-native-purchases";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";
import { RevenueCatService } from "@services/revenuecat";
import { useSubscriptionStore } from "@stores/useSubscriptionStore";

type PlanKey = "monthly" | "yearly" | "lifetime";

const FEATURE_KEYS = [
  "aiAssistant",
  "unlimitedAccounts",
  "familySharing",
  "analytics",
  "budgetPlanner",
] as const;

const PLAN_ORDER: PlanKey[] = ["monthly", "yearly", "lifetime"];

const mapPackageType = (pkg: PurchasesPackage): PlanKey | null => {
  switch (pkg.packageType) {
    case PACKAGE_TYPE.MONTHLY:
      return "monthly";
    case PACKAGE_TYPE.ANNUAL:
      return "yearly";
    case PACKAGE_TYPE.LIFETIME:
      return "lifetime";
    default:
      return null;
  }
};

const PaywallScreen = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setCustomerInfo, setOfferings, offerings, isProUser } =
    useSubscriptionStore();

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("yearly");
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  const packages = useCallback((): Record<PlanKey, PurchasesPackage | null> => {
    const result: Record<PlanKey, PurchasesPackage | null> = {
      monthly: null,
      yearly: null,
      lifetime: null,
    };
    offerings?.current?.availablePackages.forEach((pkg) => {
      const key = mapPackageType(pkg);
      if (key) result[key] = pkg;
    });
    return result;
  }, [offerings]);

  const savingsPercent = useCallback((): number | null => {
    const pkgs = packages();
    const monthly = pkgs.monthly;
    const yearly = pkgs.yearly;
    if (!monthly || !yearly) return null;
    const monthlyPrice = monthly.product.price;
    const yearlyMonthly = yearly.product.price / 12;
    return Math.round((1 - yearlyMonthly / monthlyPrice) * 100);
  }, [packages]);

  const navigateNext = useCallback(() => {
    router.replace("/(onboarding)/currency-select");
  }, []);

  useEffect(() => {
    if (isProUser) {
      navigateNext();
      return;
    }

    const loadOfferings = async () => {
      try {
        const result = await RevenueCatService.getOfferings();
        setOfferings(result);
      } catch {
        // Show paywall without RC prices on network failure
      } finally {
        setLoadingOfferings(false);
      }
    };

    loadOfferings();
  }, [isProUser, navigateNext, setOfferings]);

  const handlePurchase = useCallback(async () => {
    const pkg = packages()[selectedPlan];
    if (!pkg) return;

    setPurchasing(true);
    try {
      const customerInfo = await RevenueCatService.purchasePackage(pkg);
      setCustomerInfo(customerInfo);
      navigateNext();
    } catch (error: unknown) {
      const err = error as { userCancelled?: boolean; message?: string };
      if (!err.userCancelled) {
        Alert.alert(
          t("onboarding.paywall.errors.purchaseTitle"),
          err.message ?? t("common.cancel"),
        );
      }
    } finally {
      setPurchasing(false);
    }
  }, [packages, selectedPlan, setCustomerInfo, navigateNext, t]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const customerInfo = await RevenueCatService.restorePurchases();
      setCustomerInfo(customerInfo);
      if (RevenueCatService.checkEntitlement(customerInfo)) {
        navigateNext();
      } else {
        Alert.alert(t("onboarding.paywall.errors.restoreNotFound"));
      }
    } catch {
      // Silent — restore is a convenience action
    } finally {
      setRestoring(false);
    }
  }, [setCustomerInfo, navigateNext, t]);

  const handleCustomerCenter = useCallback(async () => {
    try {
      await RevenueCatService.presentCustomerCenter();
    } catch {
      // Customer Center not available (e.g. simulator)
    }
  }, []);

  const pkgs = packages();
  const savings = savingsPercent();

  const getPlanLabel = (plan: PlanKey) => {
    switch (plan) {
      case "monthly":
        return t("onboarding.paywall.plans.monthly");
      case "yearly":
        return t("onboarding.paywall.plans.yearly");
      case "lifetime":
        return t("onboarding.paywall.plans.lifetime");
    }
  };

  const getPlanPrice = (plan: PlanKey) => {
    const pkg = pkgs[plan];
    if (!pkg) return "—";
    return pkg.product.priceString;
  };

  const getYearlyPerMonth = () => {
    const pkg = pkgs.yearly;
    if (!pkg) return null;
    const perMonth = pkg.product.price / 12;
    const formatted = perMonth.toLocaleString(i18n.language, {
      style: "currency",
      currency: pkg.product.currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return t("onboarding.paywall.plans.perMonthBilled", { price: formatted });
  };

  const getPlanSuffix = (plan: PlanKey) => {
    switch (plan) {
      case "monthly":
        return t("onboarding.paywall.plans.perMonth");
      case "yearly":
        return t("onboarding.paywall.plans.perMonth");
      case "lifetime":
        return t("onboarding.paywall.plans.oneTime");
    }
  };

  const ctaLabel = purchasing
    ? t("onboarding.paywall.cta.processing")
    : t("onboarding.paywall.cta.getPro");

  return (
    <View
      style={[
        s.root,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
      ]}
    >
      {/* Skip button */}
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.skipButton, pressed && s.pressed]}
          onPress={navigateNext}
          hitSlop={12}
        >
          <Typography variant="bodySmall" color="textSecondary">
            {t("onboarding.paywall.skip")}
          </Typography>
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.iconBadge}>
            <Ionicons name="sparkles" size={28} color={colors.accent} />
          </View>
          <Typography variant="h2" align="center">
            {t("onboarding.paywall.title")}
          </Typography>
          <Typography
            variant="body"
            color="textSecondary"
            align="center"
            style={s.subtitle}
          >
            {t("onboarding.paywall.subtitle")}
          </Typography>
        </View>

        {/* Features */}
        <View style={s.features}>
          {FEATURE_KEYS.map((key) => (
            <View key={key} style={s.featureRow}>
              <View style={s.featureCheck}>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.accent}
                />
              </View>
              <Typography variant="body" style={s.featureText}>
                <Typography variant="body" style={s.featureBold}>
                  {t(`onboarding.paywall.featuresStyled.${key}.bold`)}
                </Typography>{" "}
                {t(`onboarding.paywall.featuresStyled.${key}.rest`)}
              </Typography>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        {loadingOfferings ? (
          <View style={s.plansLoading}>
            <ActivityIndicator color={colors.accent} />
            <Typography variant="bodySmall" color="textTertiary">
              {t("onboarding.paywall.loadingPlans")}
            </Typography>
          </View>
        ) : (
          <View style={s.plansRow}>
            {PLAN_ORDER.map((plan) => {
              const isSelected = selectedPlan === plan;
              const isYearly = plan === "yearly";
              const savePct = isYearly && savings !== null ? savings : null;

              return (
                <Pressable
                  key={plan}
                  style={({ pressed }) => [
                    s.planCard,
                    isSelected && s.planCardSelected,
                    pressed && !isSelected && s.pressed,
                  ]}
                  onPress={() => setSelectedPlan(plan)}
                >
                  {isYearly && (
                    <View style={s.saveBadge}>
                      <Typography variant="caption" color="textOnAccent">
                        {savePct !== null
                          ? t("onboarding.paywall.plans.save", {
                              percent: savePct,
                            })
                          : t("onboarding.paywall.plans.bestValue")}
                      </Typography>
                    </View>
                  )}

                  <Typography
                    variant="caption"
                    color={isSelected ? "accent" : "textTertiary"}
                    align="center"
                    style={s.planLabel}
                  >
                    {getPlanLabel(plan)}
                  </Typography>

                  <Typography
                    variant="h3"
                    align="center"
                    color={isSelected ? "textPrimary" : "textSecondary"}
                  >
                    {getPlanPrice(plan)}
                  </Typography>

                  <Typography
                    variant="caption"
                    color={isSelected ? "textSecondary" : "textTertiary"}
                    align="center"
                  >
                    {getPlanSuffix(plan)}
                  </Typography>

                  {isYearly && getYearlyPerMonth() && (
                    <Typography
                      variant="caption"
                      color="textTertiary"
                      align="center"
                      style={s.perMonthNote}
                    >
                      {getYearlyPerMonth()}
                    </Typography>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        <Typography
          variant="caption"
          color="textTertiary"
          align="center"
          style={s.disclaimer}
        >
          {t("onboarding.paywall.disclaimer")}
        </Typography>
      </ScrollView>

      {/* Sticky bottom actions */}
      <View style={s.bottomActions}>
        <Button
          variant="primary"
          loading={purchasing}
          disabled={purchasing || loadingOfferings || !pkgs[selectedPlan]}
          onPress={handlePurchase}
        >
          {ctaLabel}
        </Button>

        <View style={s.footerLinks}>
          <Pressable
            style={({ pressed }) => [s.footerLink, pressed && s.pressed]}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={colors.textTertiary} />
            ) : (
              <Typography variant="caption" color="textTertiary">
                {t("onboarding.paywall.restorePurchases")}
              </Typography>
            )}
          </Pressable>

          <View style={s.footerDot} />

          <Pressable
            style={({ pressed }) => [s.footerLink, pressed && s.pressed]}
            onPress={handleCustomerCenter}
          >
            <Typography variant="caption" color="textTertiary">
              {t("onboarding.paywall.manageSubscription")}
            </Typography>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 4,
  } as ViewStyle,
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  } as ViewStyle,
  scroll: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 24,
  } as ViewStyle,

  // Hero
  hero: {
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
  } as ViewStyle,
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  } as ViewStyle,
  subtitle: {
    maxWidth: 280,
  } as TextStyle,

  // Features
  features: {
    gap: 12,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  } as ViewStyle,
  featureCheck: {
    marginTop: 1,
  } as ViewStyle,
  featureText: {
    flex: 1,
  } as TextStyle,
  featureBold: {
    fontWeight: "600",
  } as TextStyle,

  // Social proof
  socialProof: {
    flexDirection: "row",
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  socialItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  } as ViewStyle,
  socialTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  } as ViewStyle,
  socialDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  } as ViewStyle,

  // Plans
  plansLoading: {
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  } as ViewStyle,
  plansRow: {
    flexDirection: "row",
    gap: 8,
  } as ViewStyle,
  planCard: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 4,
    minHeight: 130,
    justifyContent: "center",
  } as ViewStyle,
  planCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
  saveBadge: {
    position: "absolute",
    top: -11,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  } as ViewStyle,
  planLabel: {
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  } as TextStyle,
  perMonthNote: {
    marginTop: 2,
  } as TextStyle,

  // Disclaimer
  disclaimer: {
    marginTop: -8,
  } as TextStyle,

  // Bottom
  bottomActions: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  } as ViewStyle,
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 4,
  } as ViewStyle,
  footerLink: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  } as ViewStyle,
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textTertiary,
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
});

export default PaywallScreen;
