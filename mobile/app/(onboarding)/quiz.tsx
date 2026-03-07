import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";
import { ProgressBar } from "@components/ui/ProgressBar";
import { QuizOption } from "@components/onboarding/QuizOption";
import { useOnboardingStore } from "@stores/useOnboardingStore";

// ─── Step config ─────────────────────────────────────────────────────────────

const QUIZ_STEPS = [
  {
    type: "single" as const,
    key: "financialFeeling" as const,
    questionKey: "onboarding.quiz.financialFeeling.question",
    options: [
      {
        value: "stressed",
        emoji: "😟",
        labelKey: "onboarding.quiz.financialFeeling.stressed",
      },
      {
        value: "unsure",
        emoji: "🤔",
        labelKey: "onboarding.quiz.financialFeeling.unsure",
      },
      {
        value: "stable",
        emoji: "🙂",
        labelKey: "onboarding.quiz.financialFeeling.stable",
      },
      {
        value: "confident",
        emoji: "💪",
        labelKey: "onboarding.quiz.financialFeeling.confident",
      },
    ],
  },
  {
    type: "multi" as const,
    key: "spendingOn" as const,
    questionKey: "onboarding.quiz.spendingOn.question",
    options: [
      {
        value: "myself",
        emoji: "🙌",
        labelKey: "onboarding.quiz.spendingOn.myself",
      },
      {
        value: "partner",
        emoji: "❤️",
        labelKey: "onboarding.quiz.spendingOn.partner",
      },
      {
        value: "otherAdults",
        emoji: "👫",
        labelKey: "onboarding.quiz.spendingOn.otherAdults",
      },
      {
        value: "kids",
        emoji: "👶",
        labelKey: "onboarding.quiz.spendingOn.kids",
      },
      {
        value: "pets",
        emoji: "🐶",
        labelKey: "onboarding.quiz.spendingOn.pets",
      },
      {
        value: "other",
        emoji: "🧩",
        labelKey: "onboarding.quiz.spendingOn.other",
      },
    ],
  },
  {
    type: "multi" as const,
    key: "savingFor" as const,
    questionKey: "onboarding.quiz.savingFor.question",
    options: [
      {
        value: "emergencyFund",
        emoji: "🆘",
        labelKey: "onboarding.quiz.savingFor.emergencyFund",
      },
      {
        value: "retirement",
        emoji: "🏖️",
        labelKey: "onboarding.quiz.savingFor.retirement",
      },
      {
        value: "investments",
        emoji: "📈",
        labelKey: "onboarding.quiz.savingFor.investments",
      },
      {
        value: "newHome",
        emoji: "🏠",
        labelKey: "onboarding.quiz.savingFor.newHome",
      },
      {
        value: "newCar",
        emoji: "🚗",
        labelKey: "onboarding.quiz.savingFor.newCar",
      },
      {
        value: "vacation",
        emoji: "🌴",
        labelKey: "onboarding.quiz.savingFor.vacation",
      },
      {
        value: "other",
        emoji: "🧩",
        labelKey: "onboarding.quiz.savingFor.other",
      },
    ],
  },
  {
    type: "single" as const,
    key: "habitEase" as const,
    questionKey: "onboarding.quiz.habitEase.question",
    options: [
      {
        value: "habitPro",
        emoji: "🧠",
        labelKey: "onboarding.quiz.habitEase.habitPro",
      },
      {
        value: "strongStart",
        emoji: "😅",
        labelKey: "onboarding.quiz.habitEase.strongStart",
      },
      {
        value: "needReminders",
        emoji: "🔔",
        labelKey: "onboarding.quiz.habitEase.needReminders",
      },
      {
        value: "whatHabits",
        emoji: "🤔",
        labelKey: "onboarding.quiz.habitEase.whatHabits",
      },
    ],
  },
  {
    type: "single" as const,
    key: "goal" as const,
    questionKey: "onboarding.quiz.goal.question",
    options: [
      {
        value: "control",
        emoji: "😤",
        labelKey: "onboarding.quiz.goal.control",
      },
      { value: "invest", emoji: "📊", labelKey: "onboarding.quiz.goal.invest" },
      { value: "habits", emoji: "🛍️", labelKey: "onboarding.quiz.goal.habits" },
      {
        value: "bigPurchase",
        emoji: "🏡",
        labelKey: "onboarding.quiz.goal.bigPurchase",
      },
      {
        value: "temporaryBudget",
        emoji: "🏖️",
        labelKey: "onboarding.quiz.goal.temporaryBudget",
      },
      {
        value: "somethingElse",
        emoji: "🧩",
        labelKey: "onboarding.quiz.goal.somethingElse",
      },
    ],
  },
] as const;

const TOTAL_STEPS = 7; // 5 quiz + notifications + social proof
const STEP_NOTIFICATIONS = 5;
const STEP_SOCIAL_PROOF = 6;

// ─── Savings chart ───────────────────────────────────────────────────────────

const SavingsChart = () => {
  const { t } = useTranslation();
  return (
    <View style={sc.card}>
      <Typography variant="label" color="textSecondary">
        {t("onboarding.quiz.socialProof.chartTitle")}
      </Typography>
      <View style={sc.chartArea}>
        <Svg width="100%" height={110} viewBox="0 0 300 110">
          <Path
            d="M 8,28 C 28,22 48,40 68,36 C 88,32 108,24 128,32 C 148,40 165,48 185,54 C 205,60 222,68 242,80 C 258,89 273,100 292,108"
            stroke={colors.textTertiary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
        <View style={sc.callout}>
          <Typography variant="caption" color="textSecondary">
            {"× " + t("onboarding.quiz.socialProof.chartLabel")}
          </Typography>
        </View>
      </View>
      <View style={sc.axisRow}>
        <Typography variant="caption" color="textTertiary">
          {t("onboarding.quiz.socialProof.chartAxisStart")}
        </Typography>
        <Typography variant="caption" color="textTertiary">
          {t("onboarding.quiz.socialProof.chartAxisEnd")}
        </Typography>
      </View>
    </View>
  );
};

const sc = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 16,
    gap: 8,
  } as ViewStyle,
  chartArea: {
    position: "relative",
  } as ViewStyle,
  callout: {
    position: "absolute",
    bottom: 8,
    right: 4,
    backgroundColor: colors.backgroundSurface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  } as ViewStyle,
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  } as ViewStyle,
});

// ─── Main screen ─────────────────────────────────────────────────────────────

const QuizScreen = () => {
  const { top, bottom } = useSafeAreaInsets();
  const { t } = useTranslation();
  const { quizAnswers, setQuizAnswer } = useOnboardingStore();
  const [step, setStep] = useState(0);

  const progress = (step + 1) / TOTAL_STEPS;
  const isQuizStep = step < QUIZ_STEPS.length;
  const isNotificationsStep = step === STEP_NOTIFICATIONS;
  const isSocialProofStep = step === STEP_SOCIAL_PROOF;

  const handleBack = useCallback(() => {
    if (step === 0) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleNext = useCallback(() => {
    if (step === TOTAL_STEPS - 1) {
      router.push("/(onboarding)/currency-select");
    } else {
      setStep((s) => s + 1);
    }
  }, [step]);

  const handleEnableNotifications = useCallback(async () => {
    await Notifications.requestPermissionsAsync();
    handleNext();
  }, [handleNext]);

  const currentQuizStep = isQuizStep ? QUIZ_STEPS[step] : null;

  return (
    <View style={[s.container, { paddingTop: top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={handleBack} style={s.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <ProgressBar progress={progress} style={s.progressBar} />
        {isNotificationsStep ? (
          <Pressable onPress={handleNext} hitSlop={8}>
            <Typography variant="label" color="accent">
              {t("onboarding.quiz.notifications.skip")}
            </Typography>
          </Pressable>
        ) : (
          <View style={s.headerSpacer} />
        )}
      </View>

      {/* ── Quiz steps 1–5 ─────────────────────────────────────────────── */}
      {isQuizStep && currentQuizStep && (
        <>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[
              s.scrollContent,
              { paddingBottom: bottom + 120 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Typography variant="h1">
              {t(currentQuizStep.questionKey)}
            </Typography>
            <View style={s.optionsList}>
              {currentQuizStep.options.map((option) => {
                const isSelected =
                  currentQuizStep.type === "single"
                    ? quizAnswers[currentQuizStep.key] === option.value
                    : (quizAnswers[currentQuizStep.key] as string[]).includes(
                        option.value,
                      );

                return (
                  <QuizOption
                    key={option.value}
                    emoji={option.emoji}
                    label={t(option.labelKey)}
                    selected={isSelected}
                    type={
                      currentQuizStep.type === "single" ? "radio" : "checkbox"
                    }
                    onPress={() => {
                      setQuizAnswer(currentQuizStep.key, option.value);
                      if (currentQuizStep.type === "single") {
                        setTimeout(handleNext, 180);
                      }
                    }}
                  />
                );
              })}
            </View>
          </ScrollView>
          {currentQuizStep.type === "multi" && (
            <View style={[s.footer, { paddingBottom: bottom + 16 }]}>
              <Button
                variant="primary"
                i18nKey="common.continue"
                onPress={handleNext}
              />
            </View>
          )}
        </>
      )}

      {/* ── Step 6: Notifications ──────────────────────────────────────── */}
      {isNotificationsStep && (
        <View style={s.interstitial}>
          <View style={s.interstitialContent}>
            <Typography variant="h1">{"🔔"}</Typography>
            <Typography variant="h1">
              {t("onboarding.quiz.notifications.title")}
            </Typography>
            <Typography variant="body" color="textSecondary">
              {t("onboarding.quiz.notifications.subtitle")}
            </Typography>
          </View>
          <View style={[s.footer, { paddingBottom: bottom + 16 }]}>
            <Button
              variant="primary"
              i18nKey="onboarding.quiz.notifications.enable"
              onPress={handleEnableNotifications}
            />
          </View>
        </View>
      )}

      {/* ── Step 7: Social proof ───────────────────────────────────────── */}
      {isSocialProofStep && (
        <View style={s.interstitial}>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[
              s.scrollContent,
              { paddingBottom: bottom + 120 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <SavingsChart />
            <View style={s.socialProofText}>
              <Typography variant="h1">
                {"🚀 " + t("onboarding.quiz.socialProof.title")}
              </Typography>
              <Typography variant="body" color="textSecondary">
                {t("onboarding.quiz.socialProof.subtitle")}
              </Typography>
            </View>
          </ScrollView>
          <View style={[s.footer, { paddingBottom: bottom + 16 }]}>
            <Button
              variant="primary"
              i18nKey="common.continue"
              onPress={handleNext}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  } as ViewStyle,
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  progressBar: {
    flex: 1,
  } as ViewStyle,
  headerSpacer: {
    width: 36,
  } as ViewStyle,
  scroll: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 24,
  } as ViewStyle,
  optionsList: {
    gap: 10,
  } as ViewStyle,
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  } as ViewStyle,
  interstitial: {
    flex: 1,
  } as ViewStyle,
  interstitialContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  } as ViewStyle,
  socialProofText: {
    gap: 16,
  } as ViewStyle,
});

export default QuizScreen;
