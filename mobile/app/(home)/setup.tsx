import { useEffect } from "react";
import {
  Alert,
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Notifications from "expo-notifications";
import { useMutation } from "@tanstack/react-query";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";
import { useSetupStore } from "@stores/useSetupStore";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import { completeOnboarding } from "@services/users-api";

type StepId =
  | "currency"
  | "account"
  | "expenseCategories"
  | "incomeCategories"
  | "notifications";

type StepDef = {
  id: StepId;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  required: boolean;
  onPress?: () => void;
};

const STEPS: StepDef[] = [
  {
    id: "currency",
    icon: "cash-outline",
    required: true,
    onPress: () => router.push("/(home)/currency-select"),
  },
  {
    id: "account",
    icon: "card-outline",
    required: true,
  },
  {
    id: "expenseCategories",
    icon: "trending-down-outline",
    required: true,
  },
  {
    id: "incomeCategories",
    icon: "trending-up-outline",
    required: true,
  },
  {
    id: "notifications",
    icon: "notifications-outline",
    required: false,
  },
];

const SetupScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const completedSteps = useSetupStore((s) => s.completedSteps);
  const completeSetup = useSetupStore((s) => s.completeSetup);
  const markStepComplete = useSetupStore((s) => s.markStepComplete);
  const quizAnswers = useOnboardingStore((s) => s.quizAnswers);
  const selectedCurrencyCode = useOnboardingStore(
    (s) => s.selectedCurrencyCode,
  );
  const completeOnboardingMutation = useMutation({
    mutationFn: completeOnboarding,
  });

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status === "granted") {
        markStepComplete("notifications");
      }
    });
  }, [markStepComplete]);

  const handleFinishSetup = async () => {
    try {
      await completeOnboardingMutation.mutateAsync({
        onboarding: {
          quizAnswers,
          selectedCurrencyCode,
          setup: {
            completedSteps,
          },
        },
      });

      completeSetup();
      router.replace("/(home)");
    } catch {
      Alert.alert(
        t("onboarding.home.setup.errors.saveFailedTitle"),
        t("onboarding.home.setup.errors.saveFailedSubtitle"),
      );
    }
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {/* Header */}
      <View style={s.header}>
        <Typography variant="h2" i18nKey="onboarding.home.setup.title" />
        <Typography
          variant="bodySmall"
          color="textSecondary"
          i18nKey="onboarding.home.setup.subtitle"
        />
      </View>

      {/* Steps */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isLast = index === STEPS.length - 1;
          const canTap = !!step.onPress && !isCompleted;

          return (
            <Pressable
              key={step.id}
              style={({ pressed }) => [
                s.stepCard,
                isCompleted && s.stepCardCompleted,
                canTap && pressed && s.pressed,
                !isLast && s.stepCardSpaced,
              ]}
              onPress={canTap ? step.onPress : undefined}
              disabled={!canTap}
            >
              <View
                style={[
                  s.stepIconBadge,
                  isCompleted && s.stepIconBadgeCompleted,
                ]}
              >
                <Ionicons
                  name={step.icon}
                  size={20}
                  color={isCompleted ? colors.textTertiary : colors.accent}
                />
              </View>

              <View style={s.stepTextCol}>
                <View style={s.stepTitleRow}>
                  <Typography
                    variant="body"
                    color={isCompleted ? "textSecondary" : "textPrimary"}
                  >
                    {t(`onboarding.home.setup.steps.${step.id}.title`)}
                  </Typography>
                  {!step.required && !isCompleted && (
                    <View style={s.optionalBadge}>
                      <Typography variant="caption" color="textTertiary">
                        {t("onboarding.home.setup.optionalBadge")}
                      </Typography>
                    </View>
                  )}
                </View>
                <Typography variant="bodySmall" color="textTertiary">
                  {t(`onboarding.home.setup.steps.${step.id}.subtitle`)}
                </Typography>
              </View>

              <View style={s.stepAction}>
                {isCompleted ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.success}
                  />
                ) : canTap ? (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textTertiary}
                  />
                ) : (
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={colors.textDisabled}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <Button
          variant="primary"
          loading={completeOnboardingMutation.isPending}
          onPress={handleFinishSetup}
        >
          {completeOnboardingMutation.isPending
            ? t("common.loading")
            : t("onboarding.home.setup.finishButton")}
        </Button>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 4,
  } as ViewStyle,
  scroll: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  } as ViewStyle,
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  } as ViewStyle,
  stepCardCompleted: {
    opacity: 0.6,
  } as ViewStyle,
  stepCardSpaced: {
    marginBottom: 16,
  } as ViewStyle,
  stepIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${colors.accent}18`,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  stepIconBadgeCompleted: {
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
  stepTextCol: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  } as ViewStyle,
  optionalBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
  } as ViewStyle,
  stepAction: {
    width: 24,
    alignItems: "center",
  } as ViewStyle,
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
});

export default SetupScreen;
