import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@constants/colors";

// ─── Stat card skeleton ────────────────────────────────────────────────────────

import { Dimensions } from "react-native";

// ─── Primitive ─────────────────────────────────────────────────────────────────

type SkeletonProps = {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export const Skeleton = ({
  width,
  height,
  borderRadius = 6,
  style,
}: SkeletonProps) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[sk.base, { width, height, borderRadius }, animStyle, style]}
    />
  );
};

const sk = StyleSheet.create({
  base: {
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
});

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const StatCardSkeleton = () => (
  <View style={scs.card}>
    {/* top row: circle + badge */}
    <View style={scs.topRow}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <Skeleton width={52} height={28} borderRadius={8} />
    </View>

    {/* label */}
    <Skeleton width={80} height={13} borderRadius={6} />

    {/* amount */}
    <Skeleton width={200} height={36} borderRadius={8} />

    {/* hint box */}
    <Skeleton width="100%" height={34} borderRadius={10} />

    {/* stats row */}
    <View style={scs.statsRow}>
      <Skeleton width="48%" height={72} borderRadius={12} />
      <Skeleton width="48%" height={72} borderRadius={12} />
    </View>
  </View>
);

const scs = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 32,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    gap: 10,
  } as ViewStyle,
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as ViewStyle,
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  } as ViewStyle,
});

// ─── Category rows skeleton ────────────────────────────────────────────────────

type CategoryRowsSkeletonProps = { count?: number };

export const CategoryRowsSkeleton = ({
  count = 4,
}: CategoryRowsSkeletonProps) => (
  <View style={crs.wrapper}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={[
          crs.row,
          i === 0 && crs.firstRow,
          i === count - 1 && crs.lastRow,
          i < count - 1 && crs.divider,
        ]}
      >
        <Skeleton width={38} height={38} borderRadius={19} />
        <View style={crs.info}>
          <Skeleton width={120} height={13} borderRadius={5} />
          <Skeleton width={70} height={11} borderRadius={4} />
        </View>
        <View style={crs.right}>
          <Skeleton width={80} height={13} borderRadius={5} />
          <Skeleton width={30} height={11} borderRadius={4} />
        </View>
      </View>
    ))}
  </View>
);

const crs = StyleSheet.create({
  wrapper: {} as ViewStyle,
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: colors.backgroundElevated,
  } as ViewStyle,
  firstRow: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  } as ViewStyle,
  lastRow: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  } as ViewStyle,
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  } as ViewStyle,
  info: { flex: 1, gap: 6 } as ViewStyle,
  right: { alignItems: "flex-end", gap: 6 } as ViewStyle,
});
