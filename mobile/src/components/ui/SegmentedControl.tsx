import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@constants/colors";
import { Typography } from "@components/ui/Typography";

export type Segment<T extends string = string> = {
  key: T;
  label: string;
};

type SegmentedControlProps<T extends string = string> = {
  segments: Segment<T>[];
  activeKey: T;
  onPress: (key: T) => void;
  style?: ViewStyle;
};

export const SegmentedControl = <T extends string = string>({
  segments,
  activeKey,
  onPress,
  style,
}: SegmentedControlProps<T>) => {
  return (
    <View style={[s.container, style]}>
      {segments.map((segment) => {
        const isActive = segment.key === activeKey;

        return (
          <Pressable
            key={segment.key}
            style={[s.segment, isActive && s.segmentActive]}
            onPress={() => onPress(segment.key)}
          >
            <Typography
              variant="bodySmall"
              color={isActive ? "textPrimary" : "textTertiary"}
            >
              {segment.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 4,
  } as ViewStyle,
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderCurve: "continuous",
  } as ViewStyle,
  segmentActive: {
    backgroundColor: colors.backgroundSurface,
  } as ViewStyle,
});
