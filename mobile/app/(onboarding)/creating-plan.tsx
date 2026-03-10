import { useEffect, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

type Step = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  appearAt: number;
};

const STEPS: Step[] = [
  { key: "goals", icon: "flag-outline", appearAt: 800 },
  { key: "categories", icon: "grid-outline", appearAt: 1900 },
  { key: "insights", icon: "sparkles-outline", appearAt: 3000 },
];

const DONE_AT_MS = 3900;
const NAVIGATE_AT_MS = 5000;

const CreatingPlanScreen = () => {
  const { bottom, top } = useSafeAreaInsets();
  const { t } = useTranslation();
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const [done, setDone] = useState(false);

  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      false,
    );

    const stepTimers = STEPS.map(({ appearAt }, i) =>
      setTimeout(() => setVisibleSteps(i + 1), appearAt),
    );

    const doneTimer = setTimeout(() => setDone(true), DONE_AT_MS);

    const navTimer = setTimeout(() => {
      router.replace("/(home)");
    }, NAVIGATE_AT_MS);

    return () => {
      stepTimers.forEach(clearTimeout);
      clearTimeout(doneTimer);
      clearTimeout(navTimer);
    };
  }, [pulse]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View
      style={[
        s.container,
        { paddingTop: top + 24, paddingBottom: bottom + 24 },
      ]}
    >
      {/* Upper half — icon + title pinned to bottom edge, never moves */}
      <View style={s.headerArea}>
        <Animated.View
          entering={FadeIn.duration(500)}
          style={[s.iconBadge, !done && iconAnimatedStyle]}
        >
          {done ? (
            <Animated.View entering={ZoomIn.duration(400).springify()}>
              <Ionicons
                name="checkmark-circle"
                size={40}
                color={colors.accent}
              />
            </Animated.View>
          ) : (
            <Ionicons name="sparkles" size={36} color={colors.accent} />
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(150).duration(500)}
          style={s.titleBlock}
        >
          <Typography variant="h1" align="center">
            {done
              ? t("onboarding.creatingPlan.doneTitle")
              : t("onboarding.creatingPlan.title")}
          </Typography>
          {!done && (
            <Typography
              variant="body"
              color="textSecondary"
              align="center"
              i18nKey="onboarding.creatingPlan.subtitle"
            />
          )}
        </Animated.View>
      </View>

      {/* Lower half — steps grow downward, header unaffected */}
      <View style={s.stepsArea}>
        {STEPS.slice(0, visibleSteps).map(({ key, icon }) => (
          <Animated.View
            key={key}
            entering={FadeInDown.duration(400).springify()}
            style={s.stepRow}
          >
            <View style={s.stepIconBadge}>
              <Ionicons name={icon} size={16} color={colors.accent} />
            </View>
            <Typography variant="body">
              {t(`onboarding.creatingPlan.steps.${key}` as never)}
            </Typography>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 32,
  } as ViewStyle,
  headerArea: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 32,
    paddingBottom: 28,
  } as ViewStyle,
  stepsArea: {
    flex: 1,
    paddingTop: 28,
    gap: 12,
  } as ViewStyle,
  iconBadge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  titleBlock: {
    gap: 10,
    alignItems: "center",
  } as ViewStyle,
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  } as ViewStyle,
  stepIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${colors.accent}18`,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
});

export default CreatingPlanScreen;
