import { StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@constants/colors";

type Props = {
  progress: number; // 0–1
  style?: ViewStyle;
};

export const ProgressBar = ({ progress, style }: Props) => {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View style={[s.track, style]}>
      <View style={[s.fill, { width: `${clampedProgress * 100}%` }]} />
    </View>
  );
};

const s = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.backgroundSurface,
    overflow: "hidden",
  } as ViewStyle,
  fill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.accent,
  } as ViewStyle,
});
