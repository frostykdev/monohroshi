import { useCallback, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";
import { Button } from "@components/ui/Button";
import { AuthBottomSheet } from "@components/onboarding/AuthBottomSheet";
import { useSetupStore } from "@stores/useSetupStore";
import { useOnboardingStore } from "@stores/useOnboardingStore";
import { usePickerStore } from "@stores/usePickerStore";
import { useAppleSignIn } from "@hooks/useAppleSignIn";
import { useGoogleSignIn } from "@hooks/useGoogleSignIn";

type StepId = "currency" | "account" | "categories" | "notifications";

type StepDef = {
  id: StepId;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  required: boolean;
};

const STEPS: StepDef[] = [
  { id: "currency", icon: "cash-outline", required: true },
  { id: "account", icon: "card-outline", required: true },
  { id: "categories", icon: "pricetags-outline", required: true },
  { id: "notifications", icon: "notifications-outline", required: false },
];

const SetupScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const completedSteps = useSetupStore((s) => s.completedSteps);
  const markStepComplete = useSetupStore((s) => s.markStepComplete);
  const selectedCurrencyCode = useOnboardingStore(
    (s) => s.selectedCurrencyCode,
  );
  const setSelectedCurrencyCode = useOnboardingStore(
    (s) => s.setSelectedCurrencyCode,
  );

  const authSheetRef = useRef<BottomSheetModal>(null);

  const requiredStepIds = STEPS.filter((s) => s.required).map((s) => s.id);
  const allRequiredDone = requiredStepIds.every((id) =>
    completedSteps.includes(id),
  );

  const onAuthSuccess = useCallback(() => {
    router.replace("/(onboarding)/paywall");
  }, []);

  const { handleSignIn: handleApplePress, loading: appleLoading } =
    useAppleSignIn("signup", onAuthSuccess);

  const { handleSignIn: handleGooglePress, loading: googleLoading } =
    useGoogleSignIn("signup", onAuthSuccess);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status === "granted") {
        markStepComplete("notifications");
      }
    });
  }, [markStepComplete]);

  useFocusEffect(
    useCallback(() => {
      const store = usePickerStore.getState();
      if (store.currency) {
        setSelectedCurrencyCode(store.currency);
        markStepComplete("currency");
        usePickerStore.setState({ currency: null });
      }
    }, [setSelectedCurrencyCode, markStepComplete]),
  );

  const handleStepPress = useCallback(
    (id: StepId) => {
      if (process.env.EXPO_OS === "ios") {
        Haptics.selectionAsync();
      }

      switch (id) {
        case "currency":
          router.push(
            `/(modals)/currency-picker?selected=${selectedCurrencyCode}`,
          );
          break;
        case "account":
          router.push("/(onboarding)/account-setup");
          break;
        case "categories":
          router.push("/(onboarding)/categories-setup");
          break;
        case "notifications":
          Notifications.requestPermissionsAsync().then(({ status }) => {
            if (status === "granted") {
              markStepComplete("notifications");
            }
          });
          break;
      }
    },
    [markStepComplete, selectedCurrencyCode],
  );

  const handleFinishSetup = () => {
    authSheetRef.current?.present();
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={s.header}>
        <Typography variant="h2" i18nKey="onboarding.home.setup.title" />
        <Typography
          variant="bodySmall"
          color="textSecondary"
          i18nKey="onboarding.home.setup.subtitle"
        />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isLast = index === STEPS.length - 1;

          return (
            <Pressable
              key={step.id}
              style={({ pressed }) => [
                s.stepCard,
                pressed && s.pressed,
                !isLast && s.stepCardSpaced,
              ]}
              onPress={() => handleStepPress(step.id)}
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
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textTertiary}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={s.footer}>
        <Button
          variant="primary"
          disabled={!allRequiredDone}
          onPress={handleFinishSetup}
        >
          {t("onboarding.home.setup.finishButton")}
        </Button>
      </View>

      <AuthBottomSheet
        ref={authSheetRef}
        mode="signup"
        appleLoading={appleLoading}
        googleLoading={googleLoading}
        onApplePress={handleApplePress}
        onGooglePress={handleGooglePress}
      />
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
